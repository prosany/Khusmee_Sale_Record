import axios from 'axios';
import FormData from 'form-data';
import dotenv from 'dotenv';
dotenv.config();

export async function uploadImageToImgBB(imageBase64) {
  const form = new FormData();
  form.append('key', process.env.IMGBB_API_KEY);
  form.append('image', imageBase64);

  const res = await axios.post('https://api.imgbb.com/1/upload', form, {
    headers: form.getHeaders(),
  });
  return res.data.data.url;
}
