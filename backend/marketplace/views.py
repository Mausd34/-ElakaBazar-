from decimal import Decimal, InvalidOperation
from django.db import transaction
from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import User, Area, Address, Shop, Category, Product, ShopProduct, Cart, CartItem, Order, OrderItem, OrderStatusHistory, Review
from .serializers import RegisterSerializer, UserSerializer, AreaSerializer, AddressSerializer, ShopSerializer, CategorySerializer, ProductCatalogSerializer, ShopProductSerializer, CartSerializer, OrderSerializer, ReviewSerializer
from .permissions import IsShopkeeper, IsDeliveryAgent

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

class ShopkeeperShops(generics.ListAPIView):
    serializer_class = ShopSerializer
    permission_classes = [IsShopkeeper]
    def get_queryset(self):
        return Shop.objects.filter(owner=self.request.user).select_related("area").order_by("name")

class ShopProductManageViewSet(viewsets.ModelViewSet):
    serializer_class = ShopProductSerializer
    permission_classes = [IsShopkeeper]
    def get_queryset(self):
        return ShopProduct.objects.filter(shop__owner=self.request.user).select_related("shop", "product", "product__category").order_by("product__name", "id")
    def perform_create(self, serializer):
        serializer.save(shop=serializer.validated_data["shop"])

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
        order = Order.objects.create(customer=request.user, shop=shop, address=address, subtotal=subtotal, delivery_fee=delivery_fee, total=subtotal+delivery_fee, payment_method="COD")
        for item, sp in locked:
            OrderItem.objects.create(order=order, product=sp.product, product_name=sp.product.name, unit=sp.product.unit, quantity=item.quantity, unit_price=sp.price, line_total=sp.price*item.quantity)
            sp.stock -= item.quantity
            sp.save(update_fields=["stock", "updated_at"])
        OrderStatusHistory.objects.create(order=order, status=Order.Status.PLACED, changed_by=request.user, note="Order placed")
        cart.items.all().delete(); cart.shop = None; cart.save()
        return Response(OrderSerializer(order).data, status=201)

class OrderList(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer
    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user).select_related("shop", "address__area").prefetch_related("items", "history").order_by("-created_at")

class OrderDetail(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrderSerializer
    def get_queryset(self):
        return Order.objects.filter(customer=self.request.user).select_related("shop", "address__area").prefetch_related("items", "history")

class ShopkeeperOrders(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsShopkeeper]
    def get_queryset(self): return Order.objects.filter(shop__owner=self.request.user).select_related("shop", "address__area").prefetch_related("items", "history").order_by("-created_at")

class ShopkeeperOrderAction(APIView):
    permission_classes = [IsShopkeeper]
    allowed = {"accept": Order.Status.ACCEPTED, "reject": Order.Status.REJECTED, "preparing": Order.Status.PREPARING, "ready": Order.Status.READY}
    @transaction.atomic
    def post(self, request, pk, action_name):
        if action_name not in self.allowed: return Response({"detail":"Invalid action."}, status=400)
        order = get_object_or_404(Order.objects.select_for_update(), id=pk, shop__owner=request.user)
        target = self.allowed[action_name]
        valid = {
            "accept": [Order.Status.PLACED], "reject": [Order.Status.PLACED],
            "preparing": [Order.Status.ACCEPTED], "ready": [Order.Status.PREPARING],
        }
        if order.status not in valid[action_name]: return Response({"detail":"Invalid order status transition."}, status=400)
        order.status = target; order.save(update_fields=["status", "updated_at"])
        OrderStatusHistory.objects.create(order=order, status=target, changed_by=request.user)
        if target == Order.Status.REJECTED:
            for item in order.items.select_related("product"):
                sp = ShopProduct.objects.select_for_update().filter(shop=order.shop, product=item.product).first()
                if sp: sp.stock += item.quantity; sp.save(update_fields=["stock", "updated_at"])
        return Response(OrderSerializer(order).data)

class DeliveryJobs(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = [IsDeliveryAgent]
    def get_queryset(self): return Order.objects.filter(delivery_agent=self.request.user).exclude(status__in=[Order.Status.DELIVERED, Order.Status.CANCELLED, Order.Status.REJECTED]).prefetch_related("items")

class DeliveryAction(APIView):
    permission_classes = [IsDeliveryAgent]
    transitions = {"pickup": (Order.Status.READY, Order.Status.PICKED_UP), "complete": (Order.Status.PICKED_UP, Order.Status.DELIVERED)}
    def post(self, request, pk, action_name):
        if action_name not in self.transitions: return Response({"detail":"Invalid action."}, status=400)
        before, after = self.transitions[action_name]
        with transaction.atomic():
            order = get_object_or_404(Order.objects.select_for_update(), id=pk, delivery_agent=request.user)
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
        qs = Order.objects.select_related("shop", "customer", "delivery_agent", "address__area").prefetch_related("items", "history").order_by("-created_at")
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
