import "./globals.css";
import Providers from "./_components/Providers";
import HeaderAuth from "./_components/HeaderAuth";
import BottomNav from "./_components/BottomNav";

export const metadata = {
  title: "Fit im Garten",
  description: "Fit im Garten App",
};

export default function RootLayout({ children }) {
  return (
    <html lang="de">
      <body>
        <Providers>
          <HeaderAuth />
          <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 14px" }}>
            {children}
          </div>
          <BottomNav />
        </Providers>
      </body>
    </html>
  );
}
