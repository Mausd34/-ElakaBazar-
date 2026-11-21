from decimal import Decimal, InvalidOperation
import secrets
from urllib.parse import urlencode
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import validate_email
from django.db import transaction
from django.db.models import Q
from django.http import HttpResponseRedirect
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status, viewsets, throttling
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import User, Area, Address, Shop, Category, Product, ShopProduct, Cart, CartItem, Order, OrderItem, OrderStatusHistory, Shipment, Review
from .serializers import RegisterSerializer, UserSerializer, AreaSerializer, AddressSerializer, ShopSerializer, CatalogProductSerializer, CategorySerializer, ProductCatalogSerializer, ShopProductSerializer, CartSerializer, OrderSerializer, OrderTrackingSerializer, ShipmentSerializer, ReviewSerializer
from .permissions import IsShopkeeper, IsDeliveryAgent
from .sslcommerz import PaymentGatewayError, initiate_payment, validate_payment

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request): return Response(UserSerializer(request.user).data)

class AreaList(generics.ListAPIView):
    serializer_class = AreaSerializer
    permission_classes = [permissions.AllowAny]
    queryset = Area.objects.filter(is_active=True).order_by("name")

class AddressViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AddressSerializer
    def get_queryset(self): return Address.objects.filter(user=self.request.user).select_related("area")

class CategoryList(generics.ListAPIView):
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    queryset = Category.objects.filter(is_active=True)

class ShopList(generics.ListAPIView):
    serializer_class = ShopSerializer
    permission_classes = [permissions.AllowAny]
    def get_queryset(self):
        qs = Shop.objects.filter(status=Shop.Status.APPROVED, is_open=True).select_related("area")
        area = self.request.query_params.get("area")
        search = self.request.query_params.get("search")
        if area: qs = qs.filter(area_id=area)
        if search: qs = qs.filter(Q(name__icontains=search) | Q(description__icontains=search))
        return qs.order_by("name")

class ShopDetail(generics.RetrieveAPIView):
    serializer_class = ShopSerializer
    permission_classes = [permissions.AllowAny]
    queryset = Shop.objects.filter(status=Shop.Status.APPROVED)

class CatalogProductList(generics.ListAPIView):
    serializer_class = CatalogProductSerializer
    permission_classes = [IsShopkeeper]
    queryset = Product.objects.filter(is_active=True).select_related("category").order_by("category__name", "name")

class ShopkeeperShops(generics.ListCreateAPIView):
    serializer_class = ShopSerializer
    permission_classes = [IsShopkeeper]
    def get_queryset(self):
        return Shop.objects.filter(owner=self.request.user).select_related("area").order_by("name")
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user, status=Shop.Status.PENDING)

class ProductList(generics.ListAPIView):
    serializer_class = ShopProductSerializer
    permission_classes = [permissions.AllowAny]
    def get_queryset(self):
        qs = ShopProduct.objects.filter(is_available=True, stock__gt=0, shop__status=Shop.Status.APPROVED, shop__is_open=True).select_related("shop", "product", "product__category")
        area = self.request.query_params.get("area")
        shop = self.request.query_params.get("shop")
        category = self.request.query_params.get("category")
        search = self.request.query_params.get("search")
        if area: qs = qs.filter(shop__area_id=area)
        if shop: qs = qs.filter(shop_id=shop)
        if category: qs = qs.filter(product__category_id=category)
        if search: qs = qs.filter(Q(product__name__icontains=search) | Q(product__name_bn__icontains=search))
        return qs.order_by("product__name")

class ProductCatalogList(generics.ListAPIView):
    serializer_class = ProductCatalogSerializer
    permission_classes = [permissions.AllowAny]
    def get_queryset(self):
        qs = Product.objects.filter(is_active=True).select_related("category")
        category = self.request.query_params.get("category")
        search = self.request.query_params.get("search")
        if category: qs = qs.filter(category_id=category)
        if search: qs = qs.filter(Q(name__icontains=search) | Q(name_bn__icontains=search))
        return qs.order_by("name")

class ShopApplication(generics.CreateAPIView):
    serializer_class = ShopSerializer
    permission_classes = [IsShopkeeper]
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user, status=Shop.Status.PENDING)

class ShopProductManageViewSet(viewsets.ModelViewSet):
    serializer_class = ShopProductSerializer
    permission_classes = [IsShopkeeper]
    def get_queryset(self):
        return ShopProduct.objects.filter(shop__owner=self.request.user).select_related("shop", "product", "product__category").order_by("product__name", "id")
    def perform_create(self, serializer):
        shop = get_object_or_404(Shop, id=self.request.data.get("shop"), owner=self.request.user)
        serializer.save(shop=shop)
    def perform_update(self, serializer):
        serializer.save(shop=self.get_object().shop)

class CartView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request):
        cart, _ = Cart.objects.get_or_create(customer=request.user)
        return Response(CartSerializer(cart).data)
    def post(self, request):
        shop_product_id = request.data.get("shop_product")
        try:
            quantity = Decimal(str(request.data.get("quantity", "1")))
        except (InvalidOperation, TypeError, ValueError):
            return Response({"detail": "Enter a valid quantity."}, status=400)
        if not quantity.is_finite() or quantity <= 0: return Response({"detail":"Quantity must be positive."}, status=400)
        sp = get_object_or_404(ShopProduct.objects.select_related("shop"), id=shop_product_id, is_available=True, shop__status=Shop.Status.APPROVED, shop__is_open=True)
        if sp.stock < quantity: return Response({"detail":"Insufficient stock."}, status=400)
        cart, _ = Cart.objects.get_or_create(customer=request.user)
        if cart.shop_id and cart.shop_id != sp.shop_id:
            return Response({"detail":"Your cart contains products from another shop. Clear the cart before switching shops.", "different_shop":True}, status=409)
        cart.shop = sp.shop
        cart.save()
        item, created = CartItem.objects.get_or_create(cart=cart, shop_product=sp, defaults={"quantity":quantity})
        if not created:
            new_quantity = item.quantity + quantity
            if new_quantity > sp.stock: return Response({"detail":"Insufficient stock for the requested quantity."}, status=400)
            item.quantity = new_quantity
            item.save()
        return Response(CartSerializer(cart).data, status=201)
    def delete(self, request):
        cart, _ = Cart.objects.get_or_create(customer=request.user)
        cart.items.all().delete(); cart.shop = None; cart.save()
        return Response({"detail":"Cart cleared."})

class CartItemDetail(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def patch(self, request, pk):
        item = get_object_or_404(CartItem, pk=pk, cart__customer=request.user)
        try:
            quantity = Decimal(str(request.data.get("quantity", item.quantity)))
        except (InvalidOperation, TypeError, ValueError):
            return Response({"detail": "Enter a valid quantity."}, status=400)
        if not quantity.is_finite(): return Response({"detail": "Enter a finite quantity."}, status=400)
        if quantity <= 0: item.delete()
        elif quantity > item.shop_product.stock: return Response({"detail":"Insufficient stock."}, status=400)
        else: item.quantity = quantity; item.save()
        return Response(CartSerializer(item.cart).data)
    def delete(self, request, pk):
        item = get_object_or_404(CartItem, pk=pk, cart__customer=request.user)
        cart = item.cart; item.delete()
        if not cart.items.exists(): cart.shop = None; cart.save()
        return Response(CartSerializer(cart).data)

class CheckoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    @transaction.atomic
    def post(self, request):
        payment_method = request.data.get("payment_method", "COD")
        if payment_method not in {"COD", "SSLCOMMERZ"}:
            return Response({"detail":"Choose a supported payment method."}, status=400)
        email = request.data.get("email") or request.user.email
        if payment_method == "SSLCOMMERZ":
            if not isinstance(email, str):
                return Response({"detail":"A valid email address is required for online payment."}, status=400)
            try:
                validate_email(email)
            except ValidationError:
                return Response({"detail":"A valid email address is required for online payment."}, status=400)

        cart = get_object_or_404(Cart.objects.select_for_update(), customer=request.user)
        items = list(cart.items.select_related("shop_product__product", "shop_product__shop").all())
        if not items or not cart.shop_id: return Response({"detail":"Your cart is empty."}, status=400)
        address = get_object_or_404(Address, id=request.data.get("address"), user=request.user)
        shop = get_object_or_404(Shop, id=cart.shop_id, status=Shop.Status.APPROVED, is_open=True)
        if address.area_id != shop.area_id:
            return Response({"detail":"This shop does not currently serve the selected area."}, status=400)
        subtotal = Decimal("0.00")
        locked = []
        for item in items:
            sp = ShopProduct.objects.select_for_update().get(pk=item.shop_product_id)
            if not sp.is_available or sp.stock < item.quantity:
                return Response({"detail":f"Insufficient stock for {sp.product.name}."}, status=400)
            subtotal += sp.price * item.quantity
            locked.append((item, sp))
        if subtotal < shop.minimum_order:
            return Response({"detail":f"Minimum order is ৳{shop.minimum_order}."}, status=400)
        delivery_fee = shop.delivery_fee
        total = subtotal + delivery_fee
        if payment_method == "SSLCOMMERZ" and not Decimal("10.00") <= total <= Decimal("500000.00"):
            return Response({"detail":"Online payment must be between ৳10.00 and ৳500,000.00."}, status=400)

        order = Order.objects.create(
            customer=request.user,
            shop=shop,
            address=address,
            subtotal=subtotal,
            delivery_fee=delivery_fee,
            total=total,
            payment_method=payment_method,
            payment_transaction_id=secrets.token_hex(15) if payment_method == "SSLCOMMERZ" else None,
            tracking_number="ELK-" + secrets.token_hex(8).upper(),
        )
        for item, sp in locked:
            OrderItem.objects.create(order=order, product=sp.product, product_name=sp.product.name, unit=sp.product.unit, quantity=item.quantity, unit_price=sp.price, line_total=sp.price*item.quantity)
            sp.stock -= item.quantity
            sp.save(update_fields=["stock", "updated_at"])

        payment_url = None
        if payment_method == "SSLCOMMERZ":
            callback_base = f"{settings.PAYMENT_CALLBACK_BASE_URL}/api/v1/payments/sslcommerz"
            customer_name = (request.user.full_name or request.user.username)[:50]
            payment_parameters = {
                "total_amount": str(order.total),
                "currency": "BDT",
                "tran_id": order.payment_transaction_id,
                "success_url": f"{callback_base}/success/",
                "fail_url": f"{callback_base}/fail/",
                "cancel_url": f"{callback_base}/cancel/",
                "ipn_url": f"{callback_base}/ipn/",
                "multi_card_name": "mobilebank",
                "product_name": ", ".join(item.shop_product.product.name for item, _ in locked)[:255],
                "product_category": "Groceries",
                "product_profile": "physical-goods",
                "shipping_method": "NO",
                "cus_name": customer_name,
                "cus_email": email,
                "cus_add1": address.address_line[:50],
                "cus_city": address.area.district[:50],
                "cus_country": "Bangladesh",
                "cus_phone": address.phone,
            }
            try:
                payment_url = initiate_payment(payment_parameters)
            except PaymentGatewayError as exc:
                transaction.set_rollback(True)
                return Response({"detail":str(exc)}, status=503)

        OrderStatusHistory.objects.create(order=order, status=Order.Status.PLACED, changed_by=request.user, note="Order placed")
        cart.items.all().delete(); cart.shop = None; cart.save()
        response_data = OrderSerializer(order).data
        if payment_url:
            response_data["payment_url"] = payment_url
        return Response(response_data, status=201)


def _payment_is_validated(order, validation):
    if validation.get("status") not in {"VALID", "VALIDATED"}:
        return False
    if str(validation.get("risk_level", "0")) != "0":
        return False
    if validation.get("tran_id") != order.payment_transaction_id or validation.get("currency") != "BDT":
        return False
    if validation.get("store_id") and validation["store_id"] != settings.SSLCOMMERZ_STORE_ID:
        return False
    try:
        amount = Decimal(str(validation.get("amount")))
    except (InvalidOperation, TypeError, ValueError):
        return False
    return amount.is_finite() and amount == order.total


@transaction.atomic
def _complete_online_payment(transaction_id, val_id):
    order = get_object_or_404(
        Order.objects.select_for_update(),
        payment_transaction_id=transaction_id,
        payment_method="SSLCOMMERZ",
    )
    validation = validate_payment(val_id)
    if not _payment_is_validated(order, validation):
        return order, False
    if order.payment_status == Order.PaymentStatus.PENDING:
        order.payment_status = Order.PaymentStatus.PAID
        order.save(update_fields=["payment_status", "updated_at"])
    return order, order.payment_status == Order.PaymentStatus.PAID


@transaction.atomic
def _fail_online_payment(transaction_id):
    order = get_object_or_404(
        Order.objects.select_for_update(),
        payment_transaction_id=transaction_id,
        payment_method="SSLCOMMERZ",
    )
    if order.payment_status == Order.PaymentStatus.PENDING:
        previous_status = order.status
        order.payment_status = Order.PaymentStatus.FAILED
        order.status = Order.Status.CANCELLED
        order.save(update_fields=["payment_status", "status", "updated_at"])
        OrderStatusHistory.objects.create(
            order=order,
            previous_status=previous_status,
            status=Order.Status.CANCELLED,
            changed_by=order.customer,
            note="Online payment was not completed.",
        )
        for item in order.items.select_related("product"):
            product_listing, _ = ShopProduct.objects.select_for_update().get_or_create(
                shop=order.shop,
                product=item.product,
                defaults={"price":item.unit_price, "stock":Decimal("0"), "is_available":False},
            )
            product_listing.stock += item.quantity
            product_listing.save(update_fields=["stock", "updated_at"])

        cart, _ = Cart.objects.select_for_update().get_or_create(customer=order.customer)
        if cart.shop_id in (None, order.shop_id):
            cart.shop = order.shop
            for item in order.items.select_related("product"):
                product_listing = ShopProduct.objects.get(shop=order.shop, product=item.product)
                cart_item, created = CartItem.objects.get_or_create(
                    cart=cart,
                    shop_product=product_listing,
                    defaults={"quantity":item.quantity},
                )
                if not created:
                    cart_item.quantity += item.quantity
                    cart_item.save(update_fields=["quantity"])
            cart.save(update_fields=["shop", "updated_at"])
    return order


class SSLCommerzReturn(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request, result):
        transaction_id = request.data.get("tran_id")
        if not isinstance(transaction_id, str):
            return Response({"detail":"Invalid payment response."}, status=400)
        order = Order.objects.filter(
            payment_transaction_id=transaction_id,
            payment_method="SSLCOMMERZ",
        ).first()
        if order is None:
            return Response({"detail":"Payment order not found."}, status=404)

        if result == "success":
            val_id = request.data.get("val_id")
            if isinstance(val_id, str) and val_id:
                try:
                    order, verified = _complete_online_payment(transaction_id, val_id)
                    result = "success" if verified else "pending"
                except PaymentGatewayError:
                    result = "pending"
            else:
                result = "pending"
        elif result in {"fail", "cancel"}:
            order = _fail_online_payment(transaction_id)
            if order.payment_status == Order.PaymentStatus.PAID:
                result = "success"
        else:
            return Response({"detail":"Invalid payment result."}, status=400)

        query = urlencode({"status":result, "order":order.order_number})
        return HttpResponseRedirect(f"{settings.FRONTEND_URL}/payment-result?{query}")


class SSLCommerzIPN(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        transaction_id = request.data.get("tran_id")
        val_id = request.data.get("val_id")
        if not isinstance(transaction_id, str) or not isinstance(val_id, str) or not val_id:
            return Response({"detail":"Invalid payment notification."}, status=400)
        try:
            order = Order.objects.get(payment_transaction_id=transaction_id, payment_method="SSLCOMMERZ")
        except Order.DoesNotExist:
            return Response({"detail":"Payment order not found."}, status=404)
        try:
            order, verified = _complete_online_payment(transaction_id, val_id)
        except PaymentGatewayError:
            return Response({"detail":"Payment validation is temporarily unavailable."}, status=503)
        if not verified:
            return Response({"detail":"Payment could not be verified."}, status=400)
        return Response({"detail":"Payment verified."})

class OrderList(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer
    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user).select_related("shop", "address__area", "review").prefetch_related("items", "history").order_by("-created_at")

class OrderDetail(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer
    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user).select_related("shop", "address__area", "review").prefetch_related("items", "history")

ALLOWED_ORDER_TRANSITIONS = {
    Order.Status.PLACED: {Order.Status.ACCEPTED, Order.Status.REJECTED, Order.Status.CANCELLED},
    Order.Status.ACCEPTED: {Order.Status.PREPARING, Order.Status.CANCELLED},
    Order.Status.PREPARING: {Order.Status.READY, Order.Status.CANCELLED},
    Order.Status.READY: {Order.Status.PICKED_UP, Order.Status.CANCELLED},
    Order.Status.PICKED_UP: {Order.Status.OUT_FOR_DELIVERY, Order.Status.DELIVERED},
    Order.Status.OUT_FOR_DELIVERY: {Order.Status.DELIVERED},
}

def _online_payment_completed(order):
    return order.payment_method != "SSLCOMMERZ" or order.payment_status == Order.PaymentStatus.PAID

def transition_order(order, target, changed_by, note='', location=''):
    if not _online_payment_completed(order):
        raise ValueError('Complete online payment before order processing.')
    if target not in ALLOWED_ORDER_TRANSITIONS.get(order.status, set()):
        raise ValueError('Invalid order status transition.')
    previous = order.status
    order.status = target
    if target == Order.Status.DELIVERED and order.payment_method == 'COD':
        order.payment_status = Order.PaymentStatus.PAID
    order.save(update_fields=['status', 'payment_status', 'updated_at'])
    OrderStatusHistory.objects.create(order=order, previous_status=previous, status=target, changed_by=changed_by, note=note, location=location)
    return order

class CustomerOrderTracking(APIView):
    permission_classes = [permissions.IsAuthenticated]
    def get(self, request, pk):
        order = get_object_or_404(Order.objects.select_related('address', 'address__area', 'shop', 'customer', 'shipment').prefetch_related('items', 'history__changed_by'), id=pk, customer=request.user)
        return Response(OrderTrackingSerializer(order, context={'request': request}).data)

class PublicTracking(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = 'public_tracking'
    def get(self, request, tracking_number):
        tracking_number = tracking_number.strip().upper()
        if not 8 <= len(tracking_number) <= 64:
            return Response({'detail':'Invalid tracking number.'}, status=400)
        order = get_object_or_404(Order.objects.select_related('address', 'address__area', 'shop', 'shipment').prefetch_related('items', 'history'), tracking_number=tracking_number)
        return Response(OrderTrackingSerializer(order, context={'request': request}).data)

class AdminOrderList(generics.ListAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = OrderTrackingSerializer
    def get_queryset(self):
        qs = Order.objects.select_related('customer', 'shop', 'address', 'address__area', 'shipment').prefetch_related('items', 'history').order_by('-created_at')
        search = self.request.query_params.get('search')
        order_status = self.request.query_params.get('status')
        date = self.request.query_params.get('date')
        if search:
            qs = qs.filter(Q(order_number__icontains=search) | Q(tracking_number__icontains=search) | Q(customer__full_name__icontains=search) | Q(customer__username__icontains=search))
        if order_status:
            qs = qs.filter(status=order_status)
        if date:
            qs = qs.filter(created_at__date=date)
        return qs

class AdminOrderDetail(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAdminUser]
    serializer_class = OrderTrackingSerializer
    queryset = Order.objects.select_related('customer', 'shop', 'address', 'address__area', 'shipment').prefetch_related('items', 'history')

class AdminOrderStatus(APIView):
    permission_classes = [permissions.IsAdminUser]
    @transaction.atomic
    def patch(self, request, pk):
        order = get_object_or_404(Order.objects.select_for_update(), id=pk)
        target = request.data.get('status')
        if target not in dict(Order.Status.choices):
            return Response({'detail':'Invalid order status.'}, status=400)
        try:
            transition_order(order, target, request.user, str(request.data.get('note', ''))[:255], str(request.data.get('location', ''))[:255])
        except ValueError as exc:
            return Response({'detail':str(exc)}, status=400)
        return Response(OrderTrackingSerializer(order, context={'request': request}).data)

class AdminOrderShipment(APIView):
    permission_classes = [permissions.IsAdminUser]
    @transaction.atomic
    def post(self, request, pk):
        order = get_object_or_404(Order.objects.select_for_update(), id=pk)
        if not _online_payment_completed(order):
            return Response({'detail':'Complete online payment before preparing a shipment.'}, status=400)
        courier_name = str(request.data.get('courier_name', '')).strip()
        tracking_number = str(request.data.get('tracking_number', '')).strip().upper()
        if not courier_name or not tracking_number:
            return Response({'detail':'Courier name and tracking number are required.'}, status=400)
        if Shipment.objects.filter(tracking_number=tracking_number).exclude(order=order).exists():
            return Response({'detail':'Tracking number is already used.'}, status=400)
        shipment, _ = Shipment.objects.update_or_create(order=order, defaults={'courier_name':courier_name, 'tracking_number':tracking_number, 'shipment_status':Shipment.Status.PENDING})
        order.courier_name = courier_name
        order.tracking_number = tracking_number
        order.estimated_delivery = request.data.get('estimated_delivery') or order.estimated_delivery
        order.save(update_fields=['courier_name', 'tracking_number', 'estimated_delivery', 'updated_at'])
        return Response(ShipmentSerializer(shipment).data)

class ShopkeeperOrders(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsShopkeeper]
    def get_queryset(self): return Order.objects.filter(shop__owner=self.request.user).select_related("shop", "address__area", "review").prefetch_related("items", "history").order_by("-created_at")

class ShopkeeperOrderAction(APIView):
    permission_classes = [IsShopkeeper]
    allowed = {"accept": Order.Status.ACCEPTED, "reject": Order.Status.REJECTED, "preparing": Order.Status.PREPARING, "ready": Order.Status.READY}
    @transaction.atomic
    def post(self, request, pk, action_name):
        if action_name not in self.allowed: return Response({"detail":"Invalid action."}, status=400)
        order = get_object_or_404(Order.objects.select_for_update(), id=pk, shop__owner=request.user)
        if not _online_payment_completed(order):
            return Response({"detail":"Complete online payment before processing this order."}, status=400)
        target = self.allowed[action_name]
        previous_status = order.status
        valid = {
            "accept": [Order.Status.PLACED], "reject": [Order.Status.PLACED],
            "preparing": [Order.Status.ACCEPTED], "ready": [Order.Status.PREPARING],
        }
        if order.status not in valid[action_name]: return Response({"detail":"Invalid order status transition."}, status=400)
        order.status = target; order.save(update_fields=["status", "updated_at"])
        OrderStatusHistory.objects.create(order=order, previous_status=previous_status, status=target, changed_by=request.user)
        if target == Order.Status.REJECTED:
            for item in order.items.select_related("product"):
                sp = ShopProduct.objects.select_for_update().filter(shop=order.shop, product=item.product).first()
                if sp: sp.stock += item.quantity; sp.save(update_fields=["stock", "updated_at"])
        return Response(OrderSerializer(order).data)

class SellerOrderStatus(APIView):
    permission_classes = [IsShopkeeper]
    @transaction.atomic
    def patch(self, request, pk):
        order = get_object_or_404(Order.objects.select_for_update(), id=pk, shop__owner=request.user)
        target = request.data.get('status')
        allowed = {
            Order.Status.PLACED: {Order.Status.ACCEPTED, Order.Status.REJECTED, Order.Status.CANCELLED},
            Order.Status.ACCEPTED: {Order.Status.PREPARING, Order.Status.CANCELLED},
            Order.Status.PREPARING: {Order.Status.READY, Order.Status.CANCELLED},
        }
        if target not in allowed.get(order.status, set()):
            return Response({'detail':'Invalid seller order status transition.'}, status=400)
        try:
            transition_order(order, target, request.user, str(request.data.get('note', ''))[:255])
        except ValueError as exc:
            return Response({'detail':str(exc)}, status=400)
        if target == Order.Status.REJECTED:
            for item in order.items.select_related('product'):
                sp = ShopProduct.objects.select_for_update().filter(shop=order.shop, product=item.product).first()
                if sp:
                    sp.stock += item.quantity
                    sp.save(update_fields=['stock', 'updated_at'])
        return Response(OrderTrackingSerializer(order, context={'request': request}).data)

class SellerOrderShipment(APIView):
    permission_classes = [IsShopkeeper]
    @transaction.atomic
    def post(self, request, pk):
        order = get_object_or_404(Order.objects.select_for_update(), id=pk, shop__owner=request.user)
        if not _online_payment_completed(order):
            return Response({'detail':'Complete online payment before preparing a shipment.'}, status=400)
        if order.status not in {Order.Status.PREPARING, Order.Status.READY}:
            return Response({'detail':'Shipment can only be created after preparation.'}, status=400)
        courier_name = str(request.data.get('courier_name', '')).strip()
        tracking_number = str(request.data.get('tracking_number', '')).strip().upper()
        if not courier_name or not tracking_number:
            return Response({'detail':'Courier name and tracking number are required.'}, status=400)
        if Shipment.objects.filter(tracking_number=tracking_number).exclude(order=order).exists():
            return Response({'detail':'Tracking number is already used.'}, status=400)
        shipment, _ = Shipment.objects.update_or_create(order=order, defaults={'courier_name':courier_name, 'tracking_number':tracking_number, 'shipment_status':Shipment.Status.PENDING})
        order.courier_name = courier_name
        order.tracking_number = tracking_number
        order.save(update_fields=['courier_name', 'tracking_number', 'updated_at'])
        return Response(ShipmentSerializer(shipment).data)

class DeliveryJobs(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsDeliveryAgent]
    def get_queryset(self): return Order.objects.filter(delivery_agent=self.request.user).exclude(status__in=[Order.Status.DELIVERED, Order.Status.CANCELLED, Order.Status.REJECTED]).select_related("shop", "customer", "address__area", "review").prefetch_related("items")

class DeliveryAction(APIView):
    permission_classes = [IsDeliveryAgent]
    transitions = {"pickup": (Order.Status.READY, Order.Status.PICKED_UP), "complete": (Order.Status.PICKED_UP, Order.Status.DELIVERED)}
    def post(self, request, pk, action_name):
        if action_name not in self.transitions: return Response({"detail":"Invalid action."}, status=400)
        before, after = self.transitions[action_name]
        with transaction.atomic():
            order = get_object_or_404(Order.objects.select_for_update(), id=pk, delivery_agent=request.user)
            if not _online_payment_completed(order):
                return Response({"detail":"Complete online payment before delivery."}, status=400)
            if order.status != before: return Response({"detail":"Invalid status transition."}, status=400)
            order.status = after
            if after == Order.Status.DELIVERED and order.payment_method == "COD": order.payment_status = Order.PaymentStatus.PAID
            order.save()
            OrderStatusHistory.objects.create(order=order, status=after, changed_by=request.user)
        return Response(OrderSerializer(order).data)

class AssignDelivery(APIView):
    permission_classes = [permissions.IsAdminUser]
    def post(self, request, pk):
        order = get_object_or_404(Order, pk=pk)
        if not _online_payment_completed(order):
            return Response({"detail":"Complete online payment before assigning delivery."}, status=400)
        agent = get_object_or_404(User, pk=request.data.get("agent"), role=User.Role.DELIVERY_AGENT)
        order.delivery_agent = agent; order.save(update_fields=["delivery_agent", "updated_at"])
        return Response({"detail":"Delivery agent assigned."})


class AdminOverview(APIView):
    permission_classes = [permissions.IsAdminUser]
    def get(self, request):
        from django.db.models import Sum
        return Response({
            "shops_total": Shop.objects.count(),
            "shops_pending": Shop.objects.filter(status=Shop.Status.PENDING).count(),
            "orders_total": Order.objects.count(),
            "orders_active": Order.objects.exclude(status__in=[Order.Status.DELIVERED, Order.Status.REJECTED, Order.Status.CANCELLED]).count(),
            "orders_delivered": Order.objects.filter(status=Order.Status.DELIVERED).count(),
            "customers": User.objects.filter(role=User.Role.CUSTOMER).count(),
            "shopkeepers": User.objects.filter(role=User.Role.SHOPKEEPER).count(),
            "delivery_agents": User.objects.filter(role=User.Role.DELIVERY_AGENT).count(),
            "gross_sales": Order.objects.filter(status=Order.Status.DELIVERED).aggregate(total=Sum("total"))["total"] or Decimal("0.00"),
        })

class AdminShopList(generics.ListAPIView):
    serializer_class = ShopSerializer
    permission_classes = [permissions.IsAdminUser]
    def get_queryset(self):
        qs = Shop.objects.select_related("owner", "area").order_by("-created_at")
        status_filter = self.request.query_params.get("status")
        if status_filter: qs = qs.filter(status=status_filter.upper())
        return qs

class AdminShopAction(APIView):
    permission_classes = [permissions.IsAdminUser]
    actions = {"approve": Shop.Status.APPROVED, "reject": Shop.Status.REJECTED, "suspend": Shop.Status.SUSPENDED}
    def post(self, request, pk, action_name):
        if action_name not in self.actions:
            return Response({"detail": "Invalid shop action."}, status=400)
        shop = get_object_or_404(Shop, pk=pk)
        shop.status = self.actions[action_name]
        shop.save(update_fields=["status"])
        return Response(ShopSerializer(shop).data)

class AdminOrders(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [permissions.IsAdminUser]
    def get_queryset(self):
        qs = Order.objects.select_related("shop", "customer", "delivery_agent", "address__area", "review").prefetch_related("items", "history").order_by("-created_at")
        status_filter = self.request.query_params.get("status")
        if status_filter: qs = qs.filter(status=status_filter.upper())
        return qs

class AdminDeliveryAgents(generics.ListAPIView):
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAdminUser]
    queryset = User.objects.filter(role=User.Role.DELIVERY_AGENT, is_active=True).order_by("full_name", "username")

class AdminProductCreate(generics.CreateAPIView):
    serializer_class = ProductCatalogSerializer
    permission_classes = [permissions.IsAdminUser]

class ReviewCreate(generics.CreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ReviewSerializer
    def get_queryset(self): return Review.objects.filter(customer=self.request.user)
