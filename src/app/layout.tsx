import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ByteWorks Dashboard",
    description: "Byteworks Agency Dashboard",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // Root layout should be minimal - let each route group handle <html>/<body>
    return children;
}
