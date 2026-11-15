from rest_framework.permissions import BasePermission
class IsRole(BasePermission):
    allowed = ()
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and (request.user.is_staff or request.user.role in self.allowed))
class IsShopkeeper(IsRole): allowed = ("SHOPKEEPER",)
class IsDeliveryAgent(IsRole): allowed = ("DELIVERY_AGENT",)
class IsCustomer(IsRole): allowed = ("CUSTOMER",)
