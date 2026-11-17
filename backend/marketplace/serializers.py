from decimal import Decimal
from rest_framework import serializers
from .models import User, Area, Address, Shop, Category, Product, ShopProduct, Cart, CartItem, Order, OrderItem, OrderStatusHistory, Review

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    class Meta:
        model = User
        fields = ["id", "username", "phone", "full_name", "password"]
    def create(self, validated):
        password = validated.pop("password")
        user = User(**validated, role=User.Role.CUSTOMER)
        user.set_password(password)
        user.save()
        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "phone", "full_name", "role"]

class AreaSerializer(serializers.ModelSerializer):
    class Meta: model = Area; fields = ["id", "name", "district"]

class AddressSerializer(serializers.ModelSerializer):
    area_name = serializers.CharField(source="area.name", read_only=True)
    class Meta:
        model = Address
        fields = ["id", "area", "area_name", "address_line", "landmark", "phone", "is_default", "latitude", "longitude"]
        read_only_fields = ["id"]
    def create(self, validated):
        return Address.objects.create(user=self.context["request"].user, **validated)

class ShopSerializer(serializers.ModelSerializer):
    area_name = serializers.CharField(source="area.name", read_only=True)
    class Meta:
        model = Shop
        fields = ["id", "name", "description", "phone", "address", "area", "area_name", "is_open", "status", "delivery_fee", "minimum_order"]
        read_only_fields = ["status"]

class CategorySerializer(serializers.ModelSerializer):
    class Meta: model = Category; fields = ["id", "name", "name_bn", "image_url"]

class ProductCatalogSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    class Meta:
        model = Product
        fields = ["id", "name", "name_bn", "unit", "category", "category_name", "image_url"]

class ShopProductSerializer(serializers.ModelSerializer):
    shop = serializers.PrimaryKeyRelatedField(queryset=Shop.objects.all())
    product_name = serializers.CharField(source="product.name", read_only=True)
    product_name_bn = serializers.CharField(source="product.name_bn", read_only=True)
    unit = serializers.CharField(source="product.unit", read_only=True)
    image_url = serializers.CharField(source="product.image_url", read_only=True)
    category_name = serializers.CharField(source="product.category.name", read_only=True)
    shop_name = serializers.CharField(source="shop.name", read_only=True)
    class Meta:
        model = ShopProduct
        fields = ["id", "shop", "shop_name", "product", "product_name", "product_name_bn", "unit", "image_url", "category_name", "price", "stock", "is_available", "updated_at"]
        read_only_fields = ["id"]

    def validate_shop(self, value):
        request = self.context.get("request")
        if request and value.owner_id != request.user.id:
            raise serializers.ValidationError("You can only manage inventory for your own shop.")
        return value

    def validate_stock(self, value):
        if value < 0:
            raise serializers.ValidationError("Stock cannot be negative.")
        return value

class CartItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="shop_product.product.name", read_only=True)
    product_name_bn = serializers.CharField(source="shop_product.product.name_bn", read_only=True)
    unit = serializers.CharField(source="shop_product.product.unit", read_only=True)
    price = serializers.DecimalField(source="shop_product.price", max_digits=10, decimal_places=2, read_only=True)
    image_url = serializers.CharField(source="shop_product.product.image_url", read_only=True)
    class Meta:
        model = CartItem
        fields = ["id", "shop_product", "product_name", "product_name_bn", "unit", "price", "image_url", "quantity"]

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    shop_name = serializers.CharField(source="shop.name", read_only=True)
    class Meta: model = Cart; fields = ["id", "shop", "shop_name", "items"]

class OrderItemSerializer(serializers.ModelSerializer):
    class Meta: model = OrderItem; fields = ["product_name", "unit", "quantity", "unit_price", "line_total"]

class OrderStatusHistorySerializer(serializers.ModelSerializer):
    changed_by_name = serializers.CharField(source="changed_by.full_name", read_only=True)
    class Meta:
        model = OrderStatusHistory
        fields = ["status", "changed_by_name", "note", "created_at"]

class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    history = OrderStatusHistorySerializer(many=True, read_only=True)
    shop_name = serializers.CharField(source="shop.name", read_only=True)
    customer_name = serializers.CharField(source="customer.full_name", read_only=True)
    customer_phone = serializers.CharField(source="customer.phone", read_only=True, allow_null=True)
    address_line = serializers.CharField(source="address.address_line", read_only=True)
    area_name = serializers.CharField(source="address.area.name", read_only=True)
    delivery_agent_name = serializers.CharField(source="delivery_agent.full_name", read_only=True, allow_null=True)
    class Meta:
        model = Order
        fields = ["id", "order_number", "shop_name", "customer_name", "customer_phone", "address_line", "area_name", "subtotal", "delivery_fee", "total", "payment_method", "payment_status", "status", "delivery_agent", "delivery_agent_name", "created_at", "items", "history"]

class ReviewSerializer(serializers.ModelSerializer):
    class Meta: model = Review; fields = ["id", "order", "rating", "comment", "created_at"]
    def create(self, validated):
        order = validated["order"]
        user = self.context["request"].user
        if order.customer_id != user.id or order.status != Order.Status.DELIVERED:
            raise serializers.ValidationError("Only the customer of a delivered order can review it.")
        return Review.objects.create(customer=user, shop=order.shop, **validated)
