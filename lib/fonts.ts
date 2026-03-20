import {
  JetBrains_Mono as FontMono,
  Inter as FontSans,
  Noto_Sans_SC as FontCJK,
} from "next/font/google"

export const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const fontCJK = FontCJK({
  subsets: ["chinese-simplified"],
  weight: ["400", "500", "700"],
  variable: "--font-cjk",
})
