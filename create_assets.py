from PIL import Image

# Create icon (1024x1024)
icon = Image.new('RGB', (1024, 1024), color=(76, 175, 80))
icon.save('assets/icon.png')

# Create adaptive icon (1024x1024)
adaptive = Image.new('RGB', (1024, 1024), color=(76, 175, 80))
adaptive.save('assets/adaptive-icon.png')

# Create splash (1284x2778 - iPhone 14 Pro Max size)
splash = Image.new('RGB', (1284, 2778), color=(255, 255, 255))
splash.save('assets/splash.png')

# Create favicon (48x48)
favicon = Image.new('RGB', (48, 48), color=(76, 175, 80))
favicon.save('assets/favicon.png')

print("Assets created successfully")
