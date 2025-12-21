import Image from "next/image";

export function Logo(props: Omit<React.ComponentProps<typeof Image>, 'src' | 'alt'>) {
  return (
    <Image
      src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRUh-ob3q3db1T2oLWl0WUCfr3ukgtCmH5o2A&s"
      alt="Logo Pemko Medan"
      width={60}
      height={60}
      {...props}
    />
  );
}
