import { apiClient, getApiErrorMessage } from "@/lib/http";

export type ProductImageUploadResult = {
  filename: string;
  object_key: string;
};

export async function uploadProductImage(
  file: File,
  productId: string,
): Promise<ProductImageUploadResult> {
  const formData = new FormData();
  formData.append("file", file);

  try {
    const response = await apiClient.post<ProductImageUploadResult>(
      `/api/uploads/image?product_id=${encodeURIComponent(productId)}`,
      formData,
    );
    if (!response.data.object_key) {
      throw new Error("The server did not return an image object key.");
    }
    return response.data;
  } catch (error) {
    const apiUrl = apiClient.getUri({
      url: "/api/uploads/image",
      params: { product_id: productId },
    });
    const origin = typeof window === "undefined" ? "the current site" : window.location.origin;
    throw new Error(
      getApiErrorMessage(
        error,
        `Could not reach the image upload API at ${apiUrl} from ${origin}. Check backend connectivity and CORS settings.`,
      ),
    );
  }
}
