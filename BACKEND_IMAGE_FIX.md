# Backend Image Upload Fix

## Problem
Images upload successfully (201 response) but aren't visible after saving.

## Root Causes & Fixes

### 1. Ensure `media/` directory exists
```bash
mkdir -p media
```

### 2. Install `python-magic` (required by serializers.py for MIME detection)
```bash
pip install python-magic
# On Mac you also need:
brew install libmagic
```

### 3. Check `urls.py` already has media serving (it does):
```python
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
```

### 4. Check `settings/base.py` already has (it does):
```python
MEDIA_URL  = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
```

### 5. Verify `seller_profile/urls.py` has the media upload endpoints registered
Make sure these routes exist:
```
POST /api/seller/onboarding/studio/media/       → StudioMediaView
DELETE /api/seller/onboarding/studio/media/<id>/→ StudioMediaView
POST /api/seller/onboarding/crafts/             → CraftDetailView (handles image field)
POST /api/seller/onboarding/process/media/      → BTSMediaView
DELETE /api/seller/onboarding/process/media/<id>/→ BTSMediaView
POST /api/seller/onboarding/brands/             → BrandExperienceView (handles image field)
```

### 6. Django REST Framework parsers
Your views already have `parser_classes = [MultiPartParser, FormParser, JSONParser]` on upload views. ✓

### 7. After upload, the serializer returns a `file` URL like `/media/sellers/1/studio/filename.jpg`
The frontend shows `file_name` (just the filename string). To display the actual image, use:
```jsx
<img src={`http://127.0.0.1:8000${media.file}`} />
```
