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

const horizontalDonationReceiptEmailTemplate = ({
  logoUrl,
  title = "Molana Tariq Jamil Foundation",
  accreditationLines = [
    "Registered as Trust under Punjab Trust Act, 2020",
    "Registered as Category (A) Charity under the Punjab Charities Act, 2018",
    "Certified as NPO by Pakistan Centre of Philanthropy",
    "Approved as NPO by Federal Board of Revenue U/S 2 (36) (c) of the Income Tax Ordinance, 2001",
    "MoU signed with Economic Affairs Division, Ministry of Economic Affairs, Govt. of Pakistan.",
  ],
  offices = [
    {
      title: "Head Office",
      lines: [
        "Makhdoum Pur Road, Tulamba,",
        "District Khanewal.",
        "UAN: 061-111-786-853 | 0303-2440000",
      ],
    },
    {
      title: "Regional Office (Karachi)",
      lines: [
        "Shop #1, 190-1/A, Khayyam Chambers, Nursery Market, PECHS",
        "Block-2, Main Shahra-e-Faisal, near Blue Ribbon Bakery, Karachi.",
        "UAN: 021-111-786-853 | 0300-2001575",
        "Email: donate@mtjfoundation.org",
      ],
    },
    {
      title: "Regional Office (Multan)",
      lines: [
        "House #89, Block C,",
        "Model Town, Multan.",
        "UAN: 061-111-786-853 | 0303-2440000",
      ],
    },
    {
      title: "Regional Office (Lahore)",
      lines: [
        "59-B, Faisal Town,",
        "Opposite Moon Market, Lahore.",
        "UAN: 042-111-786-853 | 0300-4425557",
        "Email: fundraising@mtjfoundation.org",
      ],
    },
  ],
  donor = {},
  receipt = {},
}) => {
  const officeColumns = offices
    .map(
      (office, index) => `
        <td valign="top" width="25%" style="
          background-color: #cfcfcf;
          padding: 10px 15px;
          box-sizing: border-box;
          border-right: ${index !== offices.length - 1 ? "2px solid #555" : "none"};
        ">
          <h4 style="margin: 0 0 5px 0; font-size: 16px; font-weight: bold; font-family: Poppins, Arial, sans-serif;">
            ${escapeHtml(office.title)}
          </h4>
          <p style="margin: 0; font-size: 14px; line-height: 1.4; font-family: Poppins, Arial, sans-serif; white-space: pre-line;">
            ${office.lines.map((line) => escapeHtml(line)).join("<br/>")}
          </p>
        </td>
      `
    )
    .join("");

  const accreditationList = accreditationLines
    .map(
      (line) => `
        <tr>
          <td style="font-size: 13px; line-height: 1.3; font-family: 'Times New Roman', Times, serif; padding-bottom: 2px;">
            • ${escapeHtml(line)}
          </td>
        </tr>
      `
    )
    .join("");

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>${escapeHtml(title)}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 20px 0;">
        <tr>
          <td align="center">
            <table width="1000" cellpadding="0" cellspacing="0" border="0" style="
              width: 1000px;
              max-width: 1000px;
              background-color: #ffffff;
              border: 3px solid #000000;
              margin: auto;
              font-family: Poppins, Arial, sans-serif;
            ">
              
              <!-- Top Title -->
              <tr>
                <td align="center" style="text-align: center; padding: 18px 12px; background: #ffffff;">
                  <h1 style="margin: 0; font-size: 25px; font-weight: 550; color: #111111;">
                    ${escapeHtml(title)}
                  </h1>
                </td>
              </tr>

              <!-- Header Section -->
              <tr>
                <td style="padding: 0 25px 0 25px;">
                  <table width="70%" cellpadding="0" cellspacing="0" border="0" style="width: 70%;">
                    <tr>
                      <td valign="top" width="13%" style="width: 13%; padding-left: 0;">
                        <img 
                          src="${escapeHtml(logoUrl)}" 
                          alt="MTJ logo" 
                          style="display: block; margin: 55px auto 0 auto; width: 100%; height: auto;"
                        />
                      </td>
                      <td valign="top" style="padding-top: 22px;">
                        <p style="
                          line-height: 1.3;
                          font-size: 13px;
                          padding-left: 25px;
                          text-align: left;
                          margin: 0 0 8px 0;
                          font-family: 'Times New Roman', Times, serif;
                        ">
                          MTJ Foundation a Non-Profit Organization, Reviving Love for Humanity.<br/>
                          Registered and Accredited
                        </p>

                        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding-left: 25px;">
                          ${accreditationList}
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Body Receipt -->
              <tr>
                <td style="padding: 10px 0 0 0;">
                  <table width="88%" cellpadding="0" cellspacing="0" border="0" align="center" style="
                    width: 88%;
                    margin: auto;
                    font-family: monospace, Arial, sans-serif;
                    line-height: 1.7;
                  ">

                    <tr>
                      <td colspan="4" align="center" style="padding-bottom: 20px;">
                        <h2 style="margin: 0; text-align: center;">Original Receipt</h2>
                      </td>
                    </tr>

                    <tr>
                      <td width="50%" style="padding-bottom: 10px; vertical-align: top;">
                        <p style="margin: 5px 0;">
                          <strong>Receipt #:</strong>
                          <strong style="display: inline-block; border-bottom: 2px solid #000; padding-bottom: 1px;">
                            ${escapeHtml(receipt.receiptNo)}
                          </strong>
                        </p>
                      </td>
                      <td width="50%" style="padding-bottom: 10px; vertical-align: top;" colspan="3">
                        <p style="margin: 5px 0;">
                          <strong>Receipt Date:</strong>
                          <strong style="display: inline-block; border-bottom: 2px solid #000; padding-bottom: 1px;">
                            ${escapeHtml(receipt.receiptDate)}
                          </strong>
                        </p>
                      </td>
                    </tr>

                    <tr>
                      <td width="50%" style="padding-bottom: 10px; vertical-align: top;">
                        <p style="margin: 5px 0;">
                          <strong>Project:</strong>
                          <strong style="display: inline-block; border-bottom: 2px solid #000; padding-bottom: 1px;">
                            ${escapeHtml(receipt.project)}
                          </strong>
                        </p>
                      </td>
                      <td width="50%" style="padding-bottom: 10px; vertical-align: top;" colspan="3">
                        <p style="margin: 5px 0;">
                          <strong>Donation Type:</strong>
                          <strong style="display: inline-block; border-bottom: 2px solid #000; padding-bottom: 1px;">
                            ${escapeHtml(receipt.donationType)}
                          </strong>
                        </p>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding-bottom: 10px; vertical-align: middle; white-space: nowrap;">
                        <p style="margin: 5px 0;"><strong>Donor Name:</strong></p>
                      </td>
                      <td colspan="3" style="padding-bottom: 10px; width: 100%;">
                        <div style="
                          border-bottom: 1px solid #000;
                          width: 100%;
                          margin: 14px 0 14px -20px;
                          padding-bottom: 2px;
                        ">
                          ${escapeHtml(donor.name)}
                        </div>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding-bottom: 10px; vertical-align: middle; white-space: nowrap;">
                        <p style="margin: 5px 0;"><strong>Address:</strong></p>
                      </td>
                      <td colspan="3" style="padding-bottom: 10px; width: 100%;">
                        <div style="
                          border-bottom: 1px solid #000;
                          width: 100%;
                          margin: 14px 0 14px -20px;
                          padding-bottom: 2px;
                        ">
                          ${escapeHtml(donor.address)}
                        </div>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding-bottom: 10px; vertical-align: middle; white-space: nowrap;">
                        <p style="margin: 5px 0;"><strong>Contact No:</strong></p>
                      </td>
                      <td style="padding-bottom: 10px; width: 30%;">
                        <div style="
                          border-bottom: 1px solid #000;
                          width: 100%;
                          margin: 14px 0 14px -20px;
                          padding-bottom: 2px;
                        ">
                          ${escapeHtml(donor.phone)}
                        </div>
                      </td>
                      <td style="padding-bottom: 10px; vertical-align: middle; white-space: nowrap; padding-left: 20px;">
                        <p style="margin: 5px 0;"><strong>Email:</strong></p>
                      </td>
                      <td style="padding-bottom: 10px; width: 40%;">
                        <div style="
                          border-bottom: 1px solid #000;
                          width: 100%;
                          margin: 14px 0 14px -20px;
                          padding-bottom: 2px;
                        ">
                          ${escapeHtml(donor.email)}
                        </div>
                      </td>
                    </tr>

                    <tr>
                      <td colspan="4" style="padding-bottom: 10px;">
                        <p style="margin: 5px 0;">
                          <strong>Description:</strong>
                          <strong style="display: inline-block; border-bottom: 2px solid #000; padding-bottom: 1px;">
                            ${escapeHtml(receipt.description)}
                          </strong>
                        </p>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding-bottom: 10px; vertical-align: top;">
                        <p style="margin: 5px 0;">
                          <strong>Amount:</strong>
                          <strong style="display: inline-block; border-bottom: 2px solid #000; padding-bottom: 1px;">
                            ${escapeHtml(receipt.amount)}
                          </strong>
                        </p>
                      </td>
                      <td style="padding-bottom: 10px; vertical-align: top;">
                        <p style="margin: 5px 0;">
                          <strong>Currency:</strong>
                          <strong style="display: inline-block; border-bottom: 2px solid #000; padding-bottom: 1px;">
                            ${escapeHtml(receipt.currency)}
                          </strong>
                        </p>
                      </td>
                      <td style="padding-bottom: 10px; vertical-align: top;">
                        <p style="margin: 5px 0;">
                          <strong>Payment Type:</strong>
                          <strong style="display: inline-block; border-bottom: 2px solid #000; padding-bottom: 1px;">
                            ${escapeHtml(receipt.paymentType)}
                          </strong>
                        </p>
                      </td>
                      <td style="padding-bottom: 10px; vertical-align: middle;">
                        <table width="100%" cellpadding="0" cellspacing="0" border="0">
                          <tr>
                            <td style="white-space: nowrap; vertical-align: middle;">
                              <p style="margin: 5px 0;"><strong>Instrument No:</strong></p>
                            </td>
                            <td width="100%">
                              <div style="
                                border-bottom: 1px solid #000;
                                width: 100%;
                                margin: 14px 0 14px -20px;
                                padding-bottom: 2px;
                              ">
                                ${escapeHtml(donor.instrumentNo)}
                              </div>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>

                    <tr>
                      <td style="padding-bottom: 10px; vertical-align: middle; white-space: nowrap;">
                        <p style="margin: 5px 0;"><strong>Amount (in words):</strong></p>
                      </td>
                      <td style="padding-bottom: 10px;">
                        <div style="
                          border-bottom: 1px solid #000;
                          width: 100%;
                          margin: 14px 0 14px -20px;
                          padding-bottom: 2px;
                        ">
                          <strong>${escapeHtml(receipt.amountInWords)}</strong>
                        </div>
                      </td>
                      <td style="padding-bottom: 10px; vertical-align: middle; white-space: nowrap; padding-left: 20px;">
                        <p style="margin: 5px 0;"><strong>Receiver Name:</strong></p>
                      </td>
                      <td style="padding-bottom: 10px;">
                        <div style="
                          border-bottom: 1px solid #000;
                          width: 100%;
                          margin: 14px 0 14px -20px;
                          padding-bottom: 2px;
                        ">
                          ${escapeHtml(donor.receiverName)}
                        </div>
                      </td>
                    </tr>

                  </table>
                </td>
              </tr>

              <!-- Footer Offices -->
              <tr>
                <td style="padding: 0;">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="
                    background-color: #f5f5f5;
                    margin-top: 20px;
                  ">
                    <tr>
                      ${officeColumns}
                    </tr>
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

module.exports = horizontalDonationReceiptEmailTemplate;

