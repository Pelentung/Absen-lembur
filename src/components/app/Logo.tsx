import Image from "next/image";

export function Logo(props: Omit<React.ComponentProps<typeof Image>, 'src' | 'alt'>) {
  return (
    <Image
      src="https://bantuanbiayapendidikan.medan.go.id/public/images/pemko%20medan.png"
      alt="Logo Pemko Medan"
      width={40}
      height={40}
      {...props}
    />
  );
}
