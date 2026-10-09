import { ImageKit } from '@imagekit/nodejs/client';

export async function uploadImageInImageKit(file: string, filename: string) {
    const client = new ImageKit({
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY!,
    });

    const response = await client.files.upload({
        file,
        fileName: filename,
    });

    console.log(response);

    if (response && response.url && response.url.includes("ik.imagekit.io") && !response.url.includes("?tr=")) {
        response.url = `${response.url}?tr=w-1600`;
    }

    return response;
}