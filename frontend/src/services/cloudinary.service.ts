import { apiClient } from '@/lib/axios';

const ROOT_FOLDER = 'hostellife';

interface SignatureResponse {
    signature: string;
    timestamp: number;
    apiKey: string;
    folder: string;
}

/**
 * Uploads a file directly to Cloudinary using a backend-generated signature.
 * * @param file - The image file to upload.
 * @param folder - The Cloudinary folder to store the image in.
 * @returns A promise that resolves to the optimized public URL.
 */
export async function uploadImageToCloudinary(
    file: File,
    folder: string
): Promise<string> {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;

    if (!cloudName) {
        throw new Error(
            'Cloudinary cloud name environment variable is missing.'
        );
    }

    const fullFolderPath = `${ROOT_FOLDER}/${folder}`;

    // 1. Ask your Spring Boot backend for a signature
    // This requires the user to be authenticated in your app
    const signatureRes = await apiClient.get<never, SignatureResponse>(
        `/cloudinary/signature?folder=${fullFolderPath}`
    );

    const { signature, timestamp, apiKey, folder: signedFolder } = signatureRes;

    // 2. Prepare the payload for Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    // ✅ Send the exact folder path that was signed!
    formData.append('folder', signedFolder);
    formData.append('timestamp', String(timestamp));
    formData.append('api_key', apiKey);
    formData.append('signature', signature);
    // Notice: NO upload_preset is appended here.

    // 3. Upload directly to Cloudinary
    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const response = await fetch(cloudinaryUrl, {
        method: 'POST',
        body: formData,
    });

    if (!response.ok) {
        const errorData = await response.json();

        // Add this line to see EXACTLY what Cloudinary expected
        console.error('CLOUDINARY REJECTED THE UPLOAD:', errorData);

        throw new Error(
            errorData.error?.message || 'Failed to upload image to Cloudinary'
        );
    }

    const data = await response.json();

    // Auto-optimize the image on delivery
    const optimizedUrl = data.secure_url.replace(
        '/upload/',
        '/upload/f_auto,q_auto/'
    );

    return optimizedUrl;
}

export const handleUploadImage = async (
    file: File,
    folder: string
): Promise<string> => {
    try {
        // Uploads to Cloudinary into the "rooms" folder
        const imageUrl = await uploadImageToCloudinary(file, folder);
        return imageUrl;
    } catch (error) {
        console.error('Upload failed:', error);
        // Throwing allows your ImageUpload component to catch it
        // and show the localError state ("Upload failed. Please try again.")
        throw error;
    }
};
