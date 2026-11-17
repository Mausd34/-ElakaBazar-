from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import RegisterView, MeView, AreaList, AddressViewSet, CategoryList, ShopList, ShopDetail, CatalogProductList, ShopkeeperShops, ProductList, ShopProductManageViewSet, CartView, CartItemDetail, CheckoutView, OrderList, OrderDetail, ShopkeeperOrders, ShopkeeperOrderAction, DeliveryJobs, DeliveryAction, AssignDelivery, ReviewCreate

router = DefaultRouter()
router.register("addresses", AddressViewSet, basename="address")
router.register("shopkeeper/shops", ShopkeeperShops, basename="shopkeeper-shop")
router.register("shop-products/manage", ShopProductManageViewSet, basename="shop-product-manage")

urlpatterns = [
    path("token/", TokenObtainPairView.as_view()),
    path("token/refresh/", TokenRefreshView.as_view()),
    path("auth/register/", RegisterView.as_view()),
    path("auth/me/", MeView.as_view()),
    path("areas/", AreaList.as_view()),
    path("categories/", CategoryList.as_view()),
    path("shops/", ShopList.as_view()),
    path("shops/<int:pk>/", ShopDetail.as_view()),
    path("products/", ProductList.as_view()),
    path("catalog/products/", CatalogProductList.as_view()),
    path("cart/", CartView.as_view()),
    path("cart/items/<int:pk>/", CartItemDetail.as_view()),
    path("checkout/", CheckoutView.as_view()),
    path("orders/", OrderList.as_view()),
    path("orders/<uuid:pk>/", OrderDetail.as_view()),
    path("shopkeeper/orders/", ShopkeeperOrders.as_view()),
    path("shopkeeper/orders/<uuid:pk>/<str:action_name>/", ShopkeeperOrderAction.as_view()),
    path("delivery/jobs/", DeliveryJobs.as_view()),
    path("delivery/jobs/<uuid:pk>/<str:action_name>/", DeliveryAction.as_view()),
    path("admin/orders/<uuid:pk>/assign/", AssignDelivery.as_view()),
    path("reviews/", ReviewCreate.as_view()),
] + router.urls
