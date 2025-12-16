import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { isAndroid } from './platform'

/**
 * Take a photo using device camera or pick from gallery
 * @param {string} source - 'camera' | 'gallery' | 'prompt' (ask user)
 * @returns {Promise<{success: boolean, dataUrl?: string, error?: string}>}
 */
export async function takePhoto(source = 'prompt') {
  if (!isAndroid) {
    return { success: false, error: 'Camera only available on Android' }
  }

  try {
    let cameraSource
    switch (source) {
      case 'camera':
        cameraSource = CameraSource.Camera
        break
      case 'gallery':
        cameraSource = CameraSource.Photos
        break
      default:
        cameraSource = CameraSource.Prompt // Let user choose
    }

    const image = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: cameraSource,
      width: 800,
      height: 800,
      correctOrientation: true,
      promptLabelHeader: 'Pilih Sumber Foto',
      promptLabelCancel: 'Batal',
      promptLabelPhoto: 'Dari Galeri',
      promptLabelPicture: 'Ambil Foto'
    })

    if (image.dataUrl) {
      return { success: true, dataUrl: image.dataUrl }
    } else {
      return { success: false, error: 'No image data returned' }
    }
  } catch (error) {
    console.error('Camera error:', error)
    // User cancelled
    if (error.message?.includes('cancelled') || error.message?.includes('canceled')) {
      return { success: false, error: 'cancelled' }
    }
    return { success: false, error: error.message || 'Failed to take photo' }
  }
}

/**
 * Check if camera is available
 */
export async function checkCameraPermission() {
  if (!isAndroid) {
    return { granted: false, reason: 'Not on Android' }
  }

  try {
    const permissions = await Camera.checkPermissions()
    return {
      granted: permissions.camera === 'granted' && permissions.photos === 'granted',
      camera: permissions.camera,
      photos: permissions.photos
    }
  } catch (error) {
    return { granted: false, reason: error.message }
  }
}

/**
 * Request camera permissions
 */
export async function requestCameraPermission() {
  if (!isAndroid) {
    return { granted: false, reason: 'Not on Android' }
  }

  try {
    const permissions = await Camera.requestPermissions()
    return {
      granted: permissions.camera === 'granted' && permissions.photos === 'granted',
      camera: permissions.camera,
      photos: permissions.photos
    }
  } catch (error) {
    return { granted: false, reason: error.message }
  }
}
