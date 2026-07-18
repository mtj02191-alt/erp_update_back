import axios from "axios";

export class PayfastService {
  private base = "https://ipg1.apps.net.pk";

  async getAccessToken(basketId: string, amount: number | string) {
    try {
      // Build URL with query parameters (matching Postman format)
      const config = {
        method: "post",
        maxBodyLength: Infinity,
        url: `https://ipg1.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken?MERCHANT_ID=18034&SECURED_KEY=38Xi7BVgiZ7upanHIQiMB&BASKET_ID=${String(basketId)}&TXNAMT=${String(amount)}&CURRENCY_CODE=PKR`,
        headers: {},
      };
      const { data } = await axios.request(config);

      // Return complete response from Payfast
      return data;
    } catch (error) {
      console.log("error_____", error.message);
      throw new Error("PayFast error");
    }
  }
}
