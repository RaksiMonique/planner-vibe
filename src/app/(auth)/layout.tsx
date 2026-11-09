import Link from 'next/link';

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="font-heading text-primary mb-8 text-2xl">
        Life Planner
      </Link>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
