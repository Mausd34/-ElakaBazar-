from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Area, Address, Shop, Category, Product, ShopProduct, Cart, CartItem, Order, OrderItem, OrderStatusHistory, Review
admin.site.register(User, UserAdmin)
for model in [Area, Address, Shop, Category, Product, ShopProduct, Cart, CartItem, Order, OrderItem, OrderStatusHistory, Review]:
    admin.site.register(model)
