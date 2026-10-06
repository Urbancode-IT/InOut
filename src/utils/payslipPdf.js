import React from "react";
import { createRoot } from "react-dom/client";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import PayslipTemplate from "../components/admin-dashboard/payslip/PayslipTemplate";

async function waitForImages(container) {
  const imgs = Array.from(container.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve;
          })
    )
  );
}

export async function downloadPayslipPdf(viewModel, fileName) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(<PayslipTemplate data={viewModel} />);

  try {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await waitForImages(container);

    const canvas = await html2canvas(container.firstChild, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const imgData = canvas.toDataURL("image/png");

    if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    } else {
      const scaledHeight = pageHeight;
      const scaledWidth = (canvas.width * scaledHeight) / canvas.height;
      const x = (pageWidth - scaledWidth) / 2;
      pdf.addImage(imgData, "PNG", x, 0, scaledWidth, scaledHeight);
    }

    pdf.save(fileName);
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
}

export async function generatePayslipPdfBase64(viewModel) {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  document.body.appendChild(container);

  const root = createRoot(container);
  root.render(<PayslipTemplate data={viewModel} />);

  try {
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await waitForImages(container);

    const canvas = await html2canvas(container.firstChild, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    const imgData = canvas.toDataURL("image/png");

    if (imgHeight <= pageHeight) {
      pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
    } else {
      const scaledHeight = pageHeight;
      const scaledWidth = (canvas.width * scaledHeight) / canvas.height;
      const x = (pageWidth - scaledWidth) / 2;
      pdf.addImage(imgData, "PNG", x, 0, scaledWidth, scaledHeight);
    }

    return pdf.output("base64");
  } finally {
    root.unmount();
    document.body.removeChild(container);
  }
}
