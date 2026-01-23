import "./globals.css";
import Providers from "./_components/Providers";
import HeaderAuth from "./_components/HeaderAuth";
import BottomNav from "./_components/BottomNav";
import RouteHeader from "./_components/RouteHeader";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "Fit im Garten",
  description: "Fit im Garten App",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de" className={inter.className}>
      <body>
        <Providers>
          <HeaderAuth />

          <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 14px" }}>
            <RouteHeader />
            {children}
          </div>

          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
