import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "ByteWorks Dashboard",
    description: "Byteworks Agency Dashboard",
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
