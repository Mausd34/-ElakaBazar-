import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen

from django.conf import settings


class PaymentGatewayError(Exception):
    pass


def _base_url():
    if settings.SSLCOMMERZ_SANDBOX:
        return "https://sandbox.sslcommerz.com"
    return "https://securepay.sslcommerz.com"


def _ensure_configuration():
    if not settings.SSLCOMMERZ_STORE_ID or not settings.SSLCOMMERZ_STORE_PASSWORD:
        raise PaymentGatewayError("Online payments are not configured.")
    if not settings.SSLCOMMERZ_SANDBOX:
        callback_url = urlparse(settings.PAYMENT_CALLBACK_BASE_URL)
        frontend_url = urlparse(settings.FRONTEND_URL)
        if settings.DEBUG or callback_url.scheme != "https" or frontend_url.scheme != "https":
            raise PaymentGatewayError("Live payments require DEBUG=0 and HTTPS callback and frontend URLs.")


def _request_json(request):
    try:
        with urlopen(request, timeout=15) as response:
            data = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, OSError, ValueError) as exc:
        raise PaymentGatewayError("Payment provider is temporarily unavailable.") from exc
    if not isinstance(data, dict):
        raise PaymentGatewayError("Payment provider returned an invalid response.")
    return data


def initiate_payment(parameters):
    _ensure_configuration()

    payload = {
        **parameters,
        "store_id": settings.SSLCOMMERZ_STORE_ID,
        "store_passwd": settings.SSLCOMMERZ_STORE_PASSWORD,
    }
    request = Request(
        f"{_base_url()}/gwprocess/v4/api.php",
        data=urlencode(payload).encode("utf-8"),
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    response = _request_json(request)
    gateway_url = response.get("GatewayPageURL")
    parsed_url = urlparse(gateway_url or "")
    if (
        response.get("status") != "SUCCESS"
        or parsed_url.scheme != "https"
        or parsed_url.hostname != urlparse(_base_url()).hostname
    ):
        raise PaymentGatewayError("Payment provider could not start the checkout.")
    return gateway_url


def validate_payment(val_id):
    _ensure_configuration()

    query = urlencode({
        "val_id": val_id,
        "store_id": settings.SSLCOMMERZ_STORE_ID,
        "store_passwd": settings.SSLCOMMERZ_STORE_PASSWORD,
        "format": "json",
    })
    request = Request(f"{_base_url()}/validator/api/validationserverAPI.php?{query}")
    return _request_json(request)
