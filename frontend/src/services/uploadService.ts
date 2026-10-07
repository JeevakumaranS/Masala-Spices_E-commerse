import { apiClient, getApiErrorMessage } from "@/lib/http";

export type ProductImageUploadResult = {
  filename: string;
  object_key: string;
};

export async function uploadProductImage(
  file: File,
  productId: string,
  options: { section?: "products" | "combos"; name?: string } = {},
): Promise<ProductImageUploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  const section = options.section ?? "products";
  const params = {
    product_id: productId,
    section,
    ...(options.name ? { name: options.name } : {}),
  };

  try {
    const response = await apiClient.post<ProductImageUploadResult>(
      "/api/uploads/image",
      formData,
      { params },
    );
    if (!response.data.object_key) {
      throw new Error("The server did not return an image object key.");
    }
    return response.data;
  } catch (error) {
    const apiUrl = apiClient.getUri({
      url: "/api/uploads/image",
      params,
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
