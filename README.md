# Chrome Translation Extension

[English](README.md) | [简体中文](README.zh.md)

A user-friendly Chrome browser translation extension that supports both text selection translation and full-page translation features.

## Features

- Quick translation of selected text
- Full webpage content translation
- Translation results displayed directly below the original text for easy comparison
- Clean user interface that doesn't interfere with browsing experience
- Support for custom translation API and target language settings

## Installation

1. Download the project code
2. Open Chrome browser and navigate to the extensions page (chrome://extensions/)
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked extension"
5. Select the project folder

## Usage Instructions

### Text Selection Translation
1. Select the text you want to translate on the webpage
2. Click the translation button that appears or use the shortcut key (default is Alt+T)
3. The translation will appear below the selected text

### Full Page Translation
1. Click the extension icon in the browser toolbar
2. Click the "Translate Full Page" button in the popup panel
3. Wait for the translation to complete, results will be shown below the original text

## Configuration

### API Settings
1. Click the extension icon to open the settings panel
2. Enter your API key
3. Select the target translation language
4. Save settings

## Development Guide

### Project Structure
- `manifest.json`: Extension configuration file
- `popup.html` & `popup.js`: Popup panel related files
- `content.js`: Handles webpage content processing and translation display
- `background.js`: Background service for handling API requests

### Local Development
1. After modifying code, click refresh button on Chrome extensions page
2. If manifest.json is modified, the extension needs to be reloaded

## Important Notes

- Ensure API key is properly configured before use
- Full page translation may take some time, please be patient
- Some websites may restrict content selection, affecting translation functionality
- Recommended to use full page translation for large content volumes

## Contributing

Issues and Pull Requests are welcome to help improve this project.

## License

This project is open-sourced under the Apache-2.0 License, see [LICENSE](LICENSE) file for details. details.
