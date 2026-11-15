from decimal import Decimal
from django.core.management.base import BaseCommand
from marketplace.models import User, Area, Shop, Category, Product, ShopProduct

class Command(BaseCommand):
    help = "Create demo ElakaBazar users, shops and grocery products."
    def handle(self, *args, **kwargs):
        areas = {}
        locations = [
            ("Tongi", "Gazipur"),
            ("Gazipura", "Gazipur"),
            ("Board Bazar", "Gazipur"),
            ("Uttara", "Dhaka"),
            ("Mirpur", "Dhaka"),
            ("Dhanmondi", "Dhaka"),
            ("Mohammadpur", "Dhaka"),
            ("Gulshan", "Dhaka"),
            ("Banani", "Dhaka"),
            ("Badda", "Dhaka"),
            ("Bashundhara R/A", "Dhaka"),
            ("Jatrabari", "Dhaka"),
            ("Motijheel", "Dhaka"),
            ("Tejgaon", "Dhaka"),
            ("Farmgate", "Dhaka"),
            ("Lalbagh", "Dhaka"),
        ]
        for name, district in locations:
            areas[name], _ = Area.objects.get_or_create(name=name, defaults={"district":district})
        accounts = [
            ("01700000001", "Demo Customer", User.Role.CUSTOMER),
            ("01700000002", "Demo Shopkeeper", User.Role.SHOPKEEPER),
            ("01700000003", "Demo Delivery Agent", User.Role.DELIVERY_AGENT),
        ]
        users = {}
        for phone, name, role in accounts:
            user, created = User.objects.get_or_create(username=phone, defaults={"phone":phone, "full_name":name, "role":role})
            if created: user.set_password("DemoPass123!"); user.save()
            users[role] = user
        shop, _ = Shop.objects.get_or_create(owner=users[User.Role.SHOPKEEPER], name="Tongi Fresh Mart", defaults={
            "area":areas["Tongi"], "description":"Daily groceries from your neighborhood.", "phone":"01700000002",
            "address":"Tongi, Gazipur", "status":Shop.Status.APPROVED, "delivery_fee":Decimal("30"), "minimum_order":Decimal("100")
        })
        category_images = {
            "Vegetables": "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=80",
            "Eggs & Dairy": "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=900&q=80",
            "Rice & Staples": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80",
            "Fruits": "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?auto=format&fit=crop&w=900&q=80",
        }
        samples = [
            ("Vegetables", "সবজি", [
                ("Potato","আলু","kg","35","https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=80"),
                ("Onion","পেঁয়াজ","kg","110","https://images.unsplash.com/photo-1502741338009-cac2772e18bc?auto=format&fit=crop&w=900&q=80"),
                ("Tomato","টমেটো","kg","60","https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=900&q=80"),
            ]),
            ("Eggs & Dairy", "ডিম ও দুগ্ধ", [
                ("Eggs","ডিম","dozen","150","https://images.unsplash.com/photo-1506975094-7d0f5dff2ec4?auto=format&fit=crop&w=900&q=80"),
                ("Milk","দুধ","liter","90","https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=900&q=80"),
            ]),
            ("Rice & Staples", "চাল ও নিত্যপণ্য", [
                ("Rice","চাল","kg","75","https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=900&q=80"),
                ("Lentils","ডাল","kg","120","https://images.unsplash.com/photo-1604908556852-7d5d2a1d6c80?auto=format&fit=crop&w=900&q=80"),
                ("Soybean Oil","সয়াবিন তেল","liter","165","https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=900&q=80"),
            ]),
            ("Fruits", "ফল", [
                ("Banana","কলা","dozen","80","https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=900&q=80"),
                ("Apple","আপেল","kg","280","https://images.unsplash.com/photo-1567306226416-28f0efdc88ce?auto=format&fit=crop&w=900&q=80"),
            ]),
        ]
        for cat_name, cat_bn, products in samples:
            cat, _ = Category.objects.get_or_create(name=cat_name, defaults={"name_bn":cat_bn, "image_url": category_images.get(cat_name, "")})
            if cat.image_url == "":
                cat.image_url = category_images.get(cat_name, "")
                cat.save(update_fields=["image_url"])
            for name, bn, unit, price, image_url in products:
                product, _ = Product.objects.get_or_create(name=name, defaults={"name_bn":bn, "unit":unit, "category":cat, "image_url": image_url})
                if product.image_url == "":
                    product.image_url = image_url
                    product.save(update_fields=["image_url"])
                ShopProduct.objects.get_or_create(shop=shop, product=product, defaults={"price":Decimal(price), "stock":Decimal("100")})
        self.stdout.write(self.style.SUCCESS("Demo data ready. Password for demo accounts: DemoPass123!"))
