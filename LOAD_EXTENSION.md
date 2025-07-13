# Loading the Chrome Extension

## Step 1: Load the Extension

1. Open Chrome and navigate to: `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `dist` folder from this project
5. The extension will load and display an Extension ID

## Step 2: Copy the Extension ID

Your Extension ID will look something like: `abcdefghijklmnopqrstuvwxyz123456`

**IMPORTANT**: Copy this ID! You'll need it for the OAuth redirect URLs.

## Step 3: OAuth Redirect URLs

Your OAuth redirect URLs will be:
```
https://<YOUR_EXTENSION_ID>.chromiumapp.org/
```

For example, if your Extension ID is `abcdefghijklmnopqrstuvwxyz123456`, your redirect URL would be:
```
https://abcdefghijklmnopqrstuvwxyz123456.chromiumapp.org/
```

## Step 4: Test the Extension

1. Click the extension icon in Chrome toolbar
2. You should see the authentication screen
3. The extension is now ready for OAuth setup!

## Next Steps

Now that you have your Extension ID, you can:
1. Create developer accounts on HubSpot and Dwolla
2. Configure OAuth apps with the redirect URL
3. Update the `.env` file with your credentials
4. Rebuild the extension with the proper credentials

## Troubleshooting

- If the extension doesn't load, check the Chrome console for errors
- Make sure you selected the `dist` folder, not the project root
- If you make changes, rebuild with `npm run build` and reload the extension