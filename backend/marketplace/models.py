import uuid
from decimal import Decimal
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator

class User(AbstractUser):
    class Role(models.TextChoices):
        CUSTOMER = "CUSTOMER", "Customer"
        SHOPKEEPER = "SHOPKEEPER", "Shopkeeper"
        DELIVERY_AGENT = "DELIVERY_AGENT", "Delivery Agent"
        ADMIN = "ADMIN", "Admin"
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    username = models.CharField(max_length=150, unique=True)  # phone number or email-style username
    phone = models.CharField(max_length=20, unique=True, null=True, blank=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CUSTOMER)
    full_name = models.CharField(max_length=150, blank=True)

    def __str__(self):
        return self.full_name or self.username

class Area(models.Model):
    name = models.CharField(max_length=100, unique=True)
    district = models.CharField(max_length=100, default="Gazipur")
    is_active = models.BooleanField(default=True)
    def __str__(self): return f"{self.name}, {self.district}"

class Address(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="addresses")
    area = models.ForeignKey(Area, on_delete=models.PROTECT)
    address_line = models.CharField(max_length=255)
    landmark = models.CharField(max_length=150, blank=True)
    phone = models.CharField(max_length=20)
    is_default = models.BooleanField(default=False)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    def __str__(self): return f"{self.address_line}, {self.area}"

class Shop(models.Model):
    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        APPROVED = "APPROVED", "Approved"
        REJECTED = "REJECTED", "Rejected"
        SUSPENDED = "SUSPENDED", "Suspended"
    owner = models.ForeignKey(User, on_delete=models.PROTECT, related_name="shops")
    area = models.ForeignKey(Area, on_delete=models.PROTECT, related_name="shops")
    name = models.CharField(max_length=160)
    description = models.TextField(blank=True)
    phone = models.CharField(max_length=20)
    address = models.CharField(max_length=255)
    opening_time = models.TimeField(null=True, blank=True)
    closing_time = models.TimeField(null=True, blank=True)
    is_open = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    delivery_fee = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("30.00"))
    minimum_order = models.DecimalField(max_digits=8, decimal_places=2, default=Decimal("100.00"))
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self): return self.name

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    name_bn = models.CharField(max_length=100, blank=True)
    image_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    def __str__(self): return self.name

class Product(models.Model):
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="products")
    name = models.CharField(max_length=160)
    name_bn = models.CharField(max_length=160, blank=True)
    description = models.TextField(blank=True)
    unit = models.CharField(max_length=30, default="piece")
    image_url = models.URLField(blank=True)
    is_active = models.BooleanField(default=True)
    def __str__(self): return self.name

class ShopProduct(models.Model):
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name="shop_products")
    product = models.ForeignKey(Product, on_delete=models.PROTECT, related_name="shop_products")
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    stock = models.DecimalField(max_digits=10, decimal_places=3, default=Decimal("0"))
    is_available = models.BooleanField(default=True)
    updated_at = models.DateTimeField(auto_now=True)
    class Meta:
        constraints = [models.UniqueConstraint(fields=["shop", "product"], name="unique_shop_product")]
    def __str__(self): return f"{self.product} @ {self.shop}"

class Cart(models.Model):
    customer = models.OneToOneField(User, on_delete=models.CASCADE, related_name="cart")
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name="items")
    shop_product = models.ForeignKey(ShopProduct, on_delete=models.CASCADE)
    quantity = models.DecimalField(max_digits=10, decimal_places=3, validators=[MinValueValidator(Decimal("0.001"))])
    class Meta:
        constraints = [models.UniqueConstraint(fields=["cart", "shop_product"], name="unique_cart_shop_product")]

class Order(models.Model):
    class Status(models.TextChoices):
        PLACED = "PLACED", "Placed"
        ACCEPTED = "ACCEPTED", "Accepted"
        PREPARING = "PREPARING", "Preparing"
        READY = "READY", "Ready"
        PICKED_UP = "PICKED_UP", "Picked up"
        OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY", "Out for delivery"
        DELIVERED = "DELIVERED", "Delivered"
        REJECTED = "REJECTED", "Rejected"
        CANCELLED = "CANCELLED", "Cancelled"
    class PaymentStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        PAID = "PAID", "Paid"
        FAILED = "FAILED", "Failed"
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=24, unique=True, editable=False)
    customer = models.ForeignKey(User, on_delete=models.PROTECT, related_name="orders")
    shop = models.ForeignKey(Shop, on_delete=models.PROTECT, related_name="orders")
    address = models.ForeignKey(Address, on_delete=models.PROTECT)
    delivery_agent = models.ForeignKey(User, on_delete=models.PROTECT, null=True, blank=True, related_name="assigned_deliveries")
    subtotal = models.DecimalField(max_digits=10, decimal_places=2)
    delivery_fee = models.DecimalField(max_digits=8, decimal_places=2)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=30, default="COD")
    payment_status = models.CharField(max_length=20, choices=PaymentStatus.choices, default=PaymentStatus.PENDING)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.PLACED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = "ELK-" + uuid.uuid4().hex[:10].upper()
        super().save(*args, **kwargs)
    def __str__(self): return self.order_number

class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    product = models.ForeignKey(Product, on_delete=models.PROTECT)
    product_name = models.CharField(max_length=160)
    unit = models.CharField(max_length=30)
    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    line_total = models.DecimalField(max_digits=10, decimal_places=2)

class OrderStatusHistory(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="history")
    status = models.CharField(max_length=30)
    changed_by = models.ForeignKey(User, on_delete=models.PROTECT)
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class Review(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE)
    customer = models.ForeignKey(User, on_delete=models.CASCADE)
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE)
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
