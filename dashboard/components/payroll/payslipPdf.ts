import { getPayslipLogoDisplayUrl } from "./logoUrl";

type PdfOptions = {
  companyName?: string | null;
  companyLogo?: string | null;
};

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;

const money = (value: number | string | null | undefined) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const dateLabel = (value?: string | null) =>
  value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(value)) : "-";

const cleanText = (value: unknown) =>
  String(value ?? "-")
    .replace(/\u20b9/g, "Rs.")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[\u2022\u00b7]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/[^\x20-\x7E]/g, "")
    .trim() || "-";

const escapePdf = (value: unknown) =>
  cleanText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const titleCase = (value: string) =>
  value.replace(/_/g, " ").replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

const amountToWords = (amount: number): string => {
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const convert = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ` ${ones[n % 10]}` : "");
    if (n < 1000) return `${ones[Math.floor(n / 100)]} Hundred${n % 100 ? ` ${convert(n % 100)}` : ""}`;
    if (n < 100000) return `${convert(Math.floor(n / 1000))} Thousand${n % 1000 ? ` ${convert(n % 1000)}` : ""}`;
    if (n < 10000000) return `${convert(Math.floor(n / 100000))} Lakh${n % 100000 ? ` ${convert(n % 100000)}` : ""}`;
    return `${convert(Math.floor(n / 10000000))} Crore${n % 10000000 ? ` ${convert(n % 10000000)}` : ""}`;
  };

  const rupees = Math.floor(Number(amount || 0));
  return `${rupees ? convert(rupees) : "Zero"} Rupees Only`;
};

const bytesToHex = (bytes: Uint8Array) =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

const dataUrlToBytes = (dataUrl: string) => {
  const base64 = dataUrl.split(",")[1];
  if (!base64) return null;
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const loadLogoAsJpeg = async (logoUrl?: string | null) => {
  if (!logoUrl || typeof window === "undefined") return null;
  const resolvedLogoUrl = getPayslipLogoDisplayUrl(logoUrl);
  if (!resolvedLogoUrl) return null;

  return new Promise<{ width: number; height: number; bytes: Uint8Array } | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const size = 180;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, size, size);

        const ratio = Math.min(size / image.naturalWidth, size / image.naturalHeight) * 0.86;
        const width = image.naturalWidth * ratio;
        const height = image.naturalHeight * ratio;
        const x = (size - width) / 2;
        const y = (size - height) / 2;
        ctx.drawImage(image, x, y, width, height);

        const bytes = dataUrlToBytes(canvas.toDataURL("image/jpeg", 0.92));
        resolve(bytes ? { width: size, height: size, bytes } : null);
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = resolvedLogoUrl;
  });
};

export const payslipFileName = (payroll: any) => {
  const employeeId = cleanText(payroll.employee_details?.employee_id || "employee").replace(/\s+/g, "-");
  const month = cleanText(payroll.month_name || payroll.month || "payroll").replace(/\s+/g, "-");
  const year = cleanText(payroll.year || "");
  return `Payslip-${employeeId}-${month}-${year}.pdf`;
};

export const downloadPayslipPdf = async (payroll: any, options: PdfOptions = {}) => {
  const employee = payroll.employee_details || {};
  const companyName = options.companyName || "AttendStack";
  const logoImage = await loadLogoAsJpeg(options.companyLogo);
  const status = payroll.status || "PENDING";
  const period = `${payroll.month_name || payroll.month || ""} ${payroll.year || ""}`.trim();
  const payslipNo = `PS-${payroll.year || "YYYY"}${String(payroll.month || "").padStart(2, "0")}-${employee.employee_id || "EMP"}`;
  const basic = Number(payroll.basic_salary || 0);
  const allowances = Number(payroll.allowances || 0);
  const gross = basic + allowances;
  const totalDeductions = Number(payroll.deductions || 0);
  const netPay = Number(payroll.payable_salary ?? payroll.net_salary ?? 0);
  const deductionRows = Object.entries(payroll.deduction_details || {});

  const commands: string[] = [];
  const push = (command: string) => commands.push(command);

  const color = (hex: string, mode: "fill" | "stroke" = "fill") => {
    const normalized = hex.replace("#", "");
    const r = parseInt(normalized.slice(0, 2), 16) / 255;
    const g = parseInt(normalized.slice(2, 4), 16) / 255;
    const b = parseInt(normalized.slice(4, 6), 16) / 255;
    push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} ${mode === "fill" ? "rg" : "RG"}`);
  };

  const rect = (x: number, y: number, w: number, h: number, fill = true) => {
    push(`${x} ${y} ${w} ${h} re ${fill ? "f" : "S"}`);
  };

  const line = (x1: number, y1: number, x2: number, y2: number) => {
    push(`${x1} ${y1} m ${x2} ${y2} l S`);
  };

  const text = (value: unknown, x: number, y: number, size = 10, bold = false) => {
    push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${x} ${y} Td (${escapePdf(value)}) Tj ET`);
  };

  const rightText = (value: unknown, x: number, y: number, size = 10, bold = false) => {
    const textValue = cleanText(value);
    const approxWidth = textValue.length * size * 0.5;
    text(textValue, x - approxWidth, y, size, bold);
  };

  const tableCell = (label: string, value: unknown, x: number, y: number, w: number, h = 44) => {
    color("#d9e0e8", "stroke");
    rect(x, y, w, h, false);
    color("#64748b");
    text(label.toUpperCase(), x + 10, y + h - 16, 7, true);
    color("#111827");
    text(value, x + 10, y + 12, 9, true);
  };

  color("#ffffff");
  rect(0, 0, A4_WIDTH, A4_HEIGHT);

  color("#0f172a");
  rect(42, 742, 511, 74);
  color("#3b82f6");
  rect(42, 739, 170, 3);
  color("#8b5cf6");
  rect(212, 739, 170, 3);
  color("#06b6d4");
  rect(382, 739, 171, 3);

  color("#ffffff");
  text(companyName, 98, 783, 16, true);
  color("#cbd5e1");
  text("Human Resources - Payroll Department", 98, 768, 8);
  color("#ffffff");
  text("SALARY SLIP", 410, 783, 20, true);
  color("#fde047");
  rightText(status, 534, 765, 8, true);

  color("#ffffff");
  rect(56, 766, 34, 34);
  if (logoImage) {
    push("q 34 0 0 34 56 766 cm /Logo Do Q");
  } else {
    color("#0f172a");
    text(cleanText(companyName).slice(0, 1), 67, 778, 14, true);
  }

  color("#f8fafc");
  rect(42, 686, 511, 53);
  const metaW = 127.75;
  tableCell("Payslip No.", payslipNo, 42, 686, metaW, 53);
  tableCell("Pay Period", period, 42 + metaW, 686, metaW, 53);
  tableCell("Generated On", dateLabel(payroll.updated_at || payroll.created_at), 42 + metaW * 2, 686, metaW, 53);
  tableCell("Payment Date", dateLabel(payroll.paid_on), 42 + metaW * 3, 686, metaW, 53);

  color("#111827");
  text("EMPLOYEE DETAILS", 42, 654, 11, true);
  color("#111827", "stroke");
  line(42, 646, 553, 646);
  const cellW = 170.33;
  tableCell("Employee Name", employee.full_name, 42, 590, cellW, 46);
  tableCell("Employee ID", employee.employee_id, 42 + cellW, 590, cellW, 46);
  tableCell("Email Address", employee.email, 42 + cellW * 2, 590, cellW, 46);
  tableCell("Department", employee.department, 42, 544, cellW, 46);
  tableCell("Designation", employee.designation, 42 + cellW, 544, cellW, 46);
  tableCell("Annual CTC", money(employee.annual_salary), 42 + cellW * 2, 544, cellW, 46);

  color("#111827");
  text("SALARY COMPUTATION", 42, 512, 11, true);
  color("#111827", "stroke");
  line(42, 504, 553, 504);

  const tableY = 342;
  const tableH = 118;
  const colW = 244;
  color("#eff6ff");
  rect(42, tableY + tableH, colW, 30);
  color("#fff1f2");
  rect(309, tableY + tableH, colW, 30);
  color("#d9e0e8", "stroke");
  rect(42, tableY, colW, tableH + 30, false);
  rect(309, tableY, colW, tableH + 30, false);
  color("#1d4ed8");
  text("EARNINGS", 54, tableY + tableH + 11, 10, true);
  color("#be123c");
  text("DEDUCTIONS", 321, tableY + tableH + 11, 10, true);

  color("#64748b");
  text("DESCRIPTION", 54, tableY + tableH - 15, 8, true);
  rightText("AMOUNT", 274, tableY + tableH - 15, 8, true);
  text("DESCRIPTION", 321, tableY + tableH - 15, 8, true);
  rightText("AMOUNT", 541, tableY + tableH - 15, 8, true);
  color("#e8edf3", "stroke");
  line(42, tableY + tableH - 25, 286, tableY + tableH - 25);
  line(309, tableY + tableH - 25, 553, tableY + tableH - 25);

  color("#334155");
  text("Basic / Monthly Salary", 54, tableY + tableH - 45, 9);
  rightText(money(basic), 274, tableY + tableH - 45, 9);
  text("Allowances & Incentives", 54, tableY + tableH - 70, 9);
  rightText(money(allowances), 274, tableY + tableH - 70, 9);
  color("#1d4ed8");
  text("Gross Earnings", 54, tableY + 16, 9, true);
  rightText(money(gross), 274, tableY + 16, 9, true);

  color("#334155");
  if (deductionRows.length) {
    deductionRows.slice(0, 3).forEach(([reason, amount], index) => {
      const y = tableY + tableH - 45 - index * 24;
      text(titleCase(reason), 321, y, 9);
      color("#be123c");
      rightText(Number(amount || 0) > 0 ? `- ${money(amount as number)}` : "-", 541, y, 9);
      color("#334155");
    });
  } else {
    text("Total Deductions", 321, tableY + tableH - 45, 9);
    color("#be123c");
    rightText(totalDeductions > 0 ? `- ${money(totalDeductions)}` : "-", 541, tableY + tableH - 45, 9);
  }
  color("#be123c");
  text("Total Deductions", 321, tableY + 16, 9, true);
  rightText(totalDeductions > 0 ? `- ${money(totalDeductions)}` : "-", 541, tableY + 16, 9, true);

  color("#0f172a");
  rect(42, 243, 511, 78);
  color("#ffffff");
  text("NET SALARY PAYABLE", 62, 292, 8, true);
  text(money(netPay), 62, 270, 22, true);
  color("#94a3b8");
  text(amountToWords(netPay), 62, 254, 8);
  color("#cbd5e1");
  text("Gross Earnings", 405, 292, 8);
  rightText(money(gross), 535, 292, 8);
  color("#fca5a5");
  text("Total Deductions", 405, 273, 8);
  rightText(`- ${money(totalDeductions)}`, 535, 273, 8);
  color("#86efac");
  text("Net Payable", 405, 254, 9, true);
  rightText(money(netPay), 535, 254, 9, true);

  color("#98a2b3", "stroke");
  line(42, 148, 220, 148);
  line(375, 148, 553, 148);
  color("#64748b");
  text("Employee Signature & Date", 42, 132, 8, true);
  rightText("Authorized Signatory", 553, 132, 8, true);
  color("#334155");
  text(employee.full_name || "-", 42, 117, 9);
  rightText(companyName, 553, 117, 9);

  color("#d9e0e8", "stroke");
  line(42, 82, 553, 82);
  color("#64748b");
  text("This is a system-generated salary slip. For corrections, tax declarations, or payroll queries, contact HR.", 42, 64, 8);
  rightText("Powered by AttendStack", 553, 48, 8);

  const content = commands.join("\n");
  const contentLength = new TextEncoder().encode(content).length;
  const xObjectResource = logoImage ? " /XObject << /Logo 7 0 R >>" : "";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_WIDTH} ${A4_HEIGHT}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >>${xObjectResource} >> /Contents 6 0 R >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${contentLength} >>\nstream\n${content}\nendstream`,
  ];

  if (logoImage) {
    const logoHex = bytesToHex(logoImage.bytes);
    objects.push(
      `<< /Type /XObject /Subtype /Image /Width ${logoImage.width} /Height ${logoImage.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${logoHex.length + 1} >>\nstream\n${logoHex}>\nendstream`
    );
  }

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(new TextEncoder().encode(pdf).length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = new TextEncoder().encode(pdf).length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const blob = new Blob([new TextEncoder().encode(pdf)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = payslipFileName(payroll);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
