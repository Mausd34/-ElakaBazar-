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

        additional_products = [
            ("Vegetables", "সবজি", "Spinach", "পালং শাক", "kg", "50", "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=900&q=80"),
            ("Vegetables", "সবজি", "Cucumber", "শসা", "kg", "45", "https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&w=900&q=80"),
            ("Fish & Meat", "মাছ ও মাংস", "Rohu Fish", "রুই মাছ", "kg", "320", "https://images.unsplash.com/photo-1510130387422-82bed34b37e9?auto=format&fit=crop&w=900&q=80"),
            ("Fish & Meat", "মাছ ও মাংস", "Chicken", "মুরগি", "kg", "280", "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=900&q=80"),
            ("Fish & Meat", "মাছ ও মাংস", "Beef", "গরুর মাংস", "kg", "750", "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=900&q=80"),
            ("Pantry", "নিত্যপণ্য", "Sugar", "চিনি", "kg", "130", "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=900&q=80"),
            ("Pantry", "নিত্যপণ্য", "Tea", "চা পাতা", "pack", "120", "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?auto=format&fit=crop&w=900&q=80"),
            ("Household", "গৃহস্থালি", "Bath Soap", "গোসলের সাবান", "piece", "55", "https://images.unsplash.com/photo-1600857544200-b2f666a9a2ec?auto=format&fit=crop&w=900&q=80"),
        ]
        product_catalog = {product.name: product for product in Product.objects.all()}
        for category_name, category_name_bn, name, name_bn, unit, price, image_url in additional_products:
            category, _ = Category.objects.get_or_create(
                name=category_name,
                defaults={"name_bn":category_name_bn},
            )
            product, _ = Product.objects.get_or_create(
                name=name,
                defaults={
                    "name_bn":name_bn,
                    "unit":unit,
                    "category":category,
                    "image_url":image_url,
                },
            )
            if not product.image_url:
                product.image_url = image_url
                product.save(update_fields=["image_url"])
            product_catalog[name] = product

        dhaka_shops = [
            {
                "name":"Uttara Daily Needs",
                "owner_phone":"01700000004",
                "owner_name":"Uttara Demo Shopkeeper",
                "area":"Uttara",
                "address":"Sector 7, Uttara, Dhaka",
                "delivery_fee":"40",
                "minimum_order":"150",
                "products":{"Rice":"78", "Milk":"95", "Eggs":"155", "Sugar":"130", "Tea":"120", "Soybean Oil":"170"},
            },
            {
                "name":"Mirpur Fresh Market",
                "owner_phone":"01700000005",
                "owner_name":"Mirpur Demo Shopkeeper",
                "area":"Mirpur",
                "address":"Section 10, Mirpur, Dhaka",
                "delivery_fee":"35",
                "minimum_order":"120",
                "products":{"Potato":"38", "Tomato":"65", "Spinach":"50", "Cucumber":"45", "Rohu Fish":"320", "Chicken":"280"},
            },
            {
                "name":"Dhanmondi Green Basket",
                "owner_phone":"01700000006",
                "owner_name":"Dhanmondi Demo Shopkeeper",
                "area":"Dhanmondi",
                "address":"Road 8, Dhanmondi, Dhaka",
                "delivery_fee":"45",
                "minimum_order":"200",
                "products":{"Apple":"290", "Banana":"85", "Milk":"95", "Eggs":"155", "Beef":"750"},
            },
            {
                "name":"Mohammadpur Family Mart",
                "owner_phone":"01700000007",
                "owner_name":"Mohammadpur Demo Shopkeeper",
                "area":"Mohammadpur",
                "address":"Town Hall, Mohammadpur, Dhaka",
                "delivery_fee":"35",
                "minimum_order":"100",
                "products":{"Rice":"76", "Lentils":"125", "Soybean Oil":"168", "Potato":"37", "Bath Soap":"55", "Chicken":"275"},
            },
            {
                "name":"Banani Fruit & Dairy",
                "owner_phone":"01700000008",
                "owner_name":"Banani Demo Shopkeeper",
                "area":"Banani",
                "address":"Road 11, Banani, Dhaka",
                "delivery_fee":"50",
                "minimum_order":"250",
                "products":{"Apple":"300", "Banana":"90", "Milk":"100", "Eggs":"160", "Cucumber":"50", "Rohu Fish":"340"},
            },
        ]
        for shop_data in dhaka_shops:
            owner, created = User.objects.get_or_create(
                username=shop_data["owner_phone"],
                defaults={
                    "phone":shop_data["owner_phone"],
                    "full_name":shop_data["owner_name"],
                    "role":User.Role.SHOPKEEPER,
                },
            )
            if created:
                owner.set_password("DemoPass123!")
                owner.save()
            demo_shop, _ = Shop.objects.get_or_create(
                owner=owner,
                name=shop_data["name"],
                defaults={
                    "area":areas[shop_data["area"]],
                    "description":"Fresh everyday groceries from your neighborhood.",
                    "phone":shop_data["owner_phone"],
                    "address":shop_data["address"],
                    "status":Shop.Status.APPROVED,
                    "delivery_fee":Decimal(shop_data["delivery_fee"]),
                    "minimum_order":Decimal(shop_data["minimum_order"]),
                },
            )
            for product_name, price in shop_data["products"].items():
                ShopProduct.objects.get_or_create(
                    shop=demo_shop,
                    product=product_catalog[product_name],
                    defaults={"price":Decimal(price), "stock":Decimal("100")},
                )
        self.stdout.write(self.style.SUCCESS("Demo data ready. Password for demo accounts: DemoPass123!"))
