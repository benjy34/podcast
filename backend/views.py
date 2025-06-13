from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
from .database import users_collection

@csrf_exempt
def register_user(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            email = data.get('email')
            password = data.get('password')

            if not email or not password:
                return JsonResponse({"error": "Email and password required"}, status=400)

            if users_collection.find_one({"email": email}):
                return JsonResponse({"error": "User already exists"}, status=409)

            users_collection.insert_one({"email": email, "password": password})
            return JsonResponse({"message": "Registration successful"}, status=201)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)

    return JsonResponse({"error": "Invalid request method"}, status=405)
