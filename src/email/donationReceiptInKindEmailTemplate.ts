const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
};

const escapeHtml = (value) => {
  return formatValue(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
};

const formatNumber = (value) => {
  const num = Number(value || 0);
  return num.toLocaleString("en-PK");
};

const renderProductsRows = (products = []) => {
  return products
    .map(
      (item, index) => `
        <tr>
          <td style="padding: 8px 10px; border-bottom: 1px solid #ddd;">${index + 1}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #ddd;">${escapeHtml(item.name)}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #ddd; text-align: right;">${formatNumber(item.qty)}</td>
          <td style="padding: 8px 10px; border-bottom: 1px solid #ddd; text-align: right;">${formatNumber(item.amount)}</td>
        </tr>
      `,
    )
    .join("");
};

const donationReceiptInKindEmailTemplate = ({
  logoUrl,
  data,
  products = [],
}) => {
  const totalQty = products.reduce(
    (sum, item) => sum + Number(item.qty || 0),
    0,
  );
  const totalAmount = products.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0,
  );

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Donation Receipt In Kind</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: Poppins, Arial, sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr>
          <td align="center">
            <table width="950" cellpadding="0" cellspacing="0" border="0" style="width: 950px; max-width: 950px; background-color: #ffffff; border: 1px solid #000000; margin: auto;">
              
              <!-- Header -->
              <tr>
                <td style="padding: 20px 0 10px 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="18%" valign="middle" style="padding-left: 50px;">
                        <img src="${escapeHtml(logoUrl)}" alt="Receipt Logo" width="120" style="display: block; width: 120px;" />
                      </td>
                      <td width="82%" align="center" valign="middle">
                        <h2 style="margin: 0; font-size: 28px; font-weight: 700; color: #000000;">
                          Molana Tariq Jamil Foundation
                        </h2>
                        <p style="margin: 8px 0; font-size: 16px; color: #000000;">
                          Head Office Tulamba
                        </p>
                        <div style="display: inline-block; border: 3px solid #000000; background-color: #000000; color: #ffffff; padding: 8px 20px; font-size: 20px; font-weight: 700; width: 80%; text-align: center;">
                          Donation Receipt In Kind
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Receipt Data -->
              <tr>
                <td style="padding: 10px 20px 0 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td width="60%" valign="top" style="padding-right: 20px;">
                        <p style="margin: 0 0 14px 0; line-height: 1.8;"><strong>Receipt # : </strong> ${escapeHtml(data.receiptNo)}</p>
                        <p style="margin: 0 0 14px 0; line-height: 1.8;"><strong>Location : </strong> ${escapeHtml(data.location)}</p>
                        <p style="margin: 0 0 14px 0; line-height: 1.8;"><strong>Project : </strong> ${escapeHtml(data.project)}</p>
                        <p style="margin: 0 0 14px 0; line-height: 1.8;"><strong>Library A/c : </strong> ${escapeHtml(data.libraryAccount)}</p>
                        <p style="margin: 0 0 14px 0; line-height: 1.8;"><strong>Donor Name : </strong> ${escapeHtml(data.donorName)}</p>
                        <p style="margin: 0 0 14px 0; line-height: 1.8;"><strong>Address : </strong> ${escapeHtml(data.address)}</p>
                        <p style="margin: 0 0 14px 0; line-height: 1.8;"><strong>Donor Bank : </strong> ${escapeHtml(data.donorBank)}</p>
                        <p style="margin: 0 0 14px 0; line-height: 1.8;"><strong>Unrestricted A/c : </strong> ${escapeHtml(data.unrestrictedAccount)}</p>
                        <p style="margin: 0 0 14px 0; line-height: 1.8;"><strong>Narration : </strong> ${escapeHtml(data.narration)}</p>
                      </td>

                      <td width="40%" valign="top">
                        <p style="margin: 0 0 14px 0; line-height: 1.8;"><strong>Receipt Date :</strong> ${escapeHtml(data.receiptDate)}</p>
                        <p style="margin: 0 0 14px 0; line-height: 1.8;"><strong>Store :</strong> ${escapeHtml(data.store)}</p>
                        <p style="margin: 0 0 14px 0; line-height: 1.8;"><strong>Activity :</strong> ${escapeHtml(data.activity)}</p>
                        <p style="margin: 0 0 14px 0; line-height: 1.8;"><strong>Donation Type :</strong> ${escapeHtml(data.donationType)}</p>
                        <p style="margin: 0 0 14px 0; line-height: 1.8;"><strong>Contact No :</strong> ${escapeHtml(data.contactNo)}</p>
                        <p style="margin: 0 0 14px 0; line-height: 1.8;"><strong>CNIC :</strong> ${escapeHtml(data.cnic)}</p>
                        <p style="margin: 0 0 14px 0; line-height: 1.8;"><strong>Bank A/C :</strong> ${escapeHtml(data.bankAccount)}</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Product Table -->
              <tr>
                <td style="padding: 10px 20px 20px 20px;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width: 100%; border-collapse: collapse; margin-top: 20px; font-family: Arial, sans-serif; font-size: 16px;">
                    <thead>
                      <tr>
                        <th style="background-color: #f2f2f2; padding: 10px; text-align: left; border-bottom: 2px solid #ccc;">#</th>
                        <th style="background-color: #f2f2f2; padding: 10px; text-align: left; border-bottom: 2px solid #ccc;">Product</th>
                        <th style="background-color: #f2f2f2; padding: 10px; text-align: right; border-bottom: 2px solid #ccc;">QTY</th>
                        <th style="background-color: #f2f2f2; padding: 10px; text-align: right; border-bottom: 2px solid #ccc;">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${renderProductsRows(products)}
                      <tr style="font-weight: bold; background-color: #f9f9f9; border-top: 2px solid #999;">
                        <td colspan="2" style="padding: 10px; text-align: center; border-bottom: 1px solid #ddd;">
                          Total:
                        </td>
                        <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">
                          ${formatNumber(totalQty)}
                        </td>
                        <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ddd;">
                          ${formatNumber(totalAmount)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
};

export default donationReceiptInKindEmailTemplate;
