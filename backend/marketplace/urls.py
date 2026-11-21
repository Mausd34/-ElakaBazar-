
from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import (
    RegisterView, MeView, AreaList, AddressViewSet,
    CategoryList, ShopList, ShopDetail,
    CatalogProductList, ProductCatalogList,
    ShopkeeperShops, ShopApplication,
    ProductList, ShopProductManageViewSet,
    CartView, CartItemDetail, CheckoutView,
    OrderList, OrderDetail,
    CustomerOrderTracking, PublicTracking,
    AdminOrderList, AdminOrderDetail,
    AdminOrderStatus, AdminOrderShipment,
    SellerOrderStatus, SellerOrderShipment,
    ShopkeeperOrders, ShopkeeperOrderAction,
    DeliveryJobs, DeliveryAction, AssignDelivery,
    ReviewCreate,
    AdminOverview, AdminShopList, AdminShopAction,
    AdminOrders, AdminDeliveryAgents, AdminProductCreate,
    SSLCommerzReturn, SSLCommerzIPN,
)

router = DefaultRouter()
router.register("addresses", AddressViewSet, basename="address")
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
    path("catalog/products/list/", ProductCatalogList.as_view()),

    path("shopkeeper/shops/", ShopkeeperShops.as_view()),
    path("shopkeeper/shops/apply/", ShopApplication.as_view()),

    path("cart/", CartView.as_view()),
    path("cart/items/<int:pk>/", CartItemDetail.as_view()),
    path("checkout/", CheckoutView.as_view()),
    path("payments/sslcommerz/success/", SSLCommerzReturn.as_view(), {"result":"success"}),
    path("payments/sslcommerz/fail/", SSLCommerzReturn.as_view(), {"result":"fail"}),
    path("payments/sslcommerz/cancel/", SSLCommerzReturn.as_view(), {"result":"cancel"}),
    path("payments/sslcommerz/ipn/", SSLCommerzIPN.as_view()),

    path("orders/", OrderList.as_view()),
    path("orders/<uuid:pk>/", OrderDetail.as_view()),
    path("orders/<uuid:pk>/tracking/", CustomerOrderTracking.as_view()),
    path("orders/<uuid:pk>/history/", CustomerOrderTracking.as_view()),
    path("track/<str:tracking_number>/", PublicTracking.as_view()),

    path("admin/orders/", AdminOrderList.as_view()),
    path("admin/orders/<uuid:pk>/", AdminOrderDetail.as_view()),
    path("admin/orders/<uuid:pk>/status/", AdminOrderStatus.as_view()),
    path("admin/orders/<uuid:pk>/shipment/", AdminOrderShipment.as_view()),
    path("admin/orders/<uuid:pk>/assign/", AssignDelivery.as_view()),

    path("shopkeeper/orders/", ShopkeeperOrders.as_view()),
    path("shopkeeper/orders/<uuid:pk>/<str:action_name>/", ShopkeeperOrderAction.as_view()),

    path("seller/orders/<uuid:pk>/status/", SellerOrderStatus.as_view()),
    path("seller/orders/<uuid:pk>/shipment/", SellerOrderShipment.as_view()),

    path("delivery/jobs/", DeliveryJobs.as_view()),
    path("delivery/jobs/<uuid:pk>/<str:action_name>/", DeliveryAction.as_view()),

    path("admin/overview/", AdminOverview.as_view()),
    path("admin/shops/", AdminShopList.as_view()),
    path("admin/shops/<int:pk>/<str:action_name>/", AdminShopAction.as_view()),
    path("admin/orders/list/", AdminOrders.as_view()),
    path("admin/delivery-agents/", AdminDeliveryAgents.as_view()),
    path("admin/products/", AdminProductCreate.as_view()),

    path("reviews/", ReviewCreate.as_view()),
] + router.urls
