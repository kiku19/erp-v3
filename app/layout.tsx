import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ERP v3",
  description: "ERP v3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
