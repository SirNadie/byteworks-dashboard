import { SkeletonPage } from '@/components/ui/Skeleton';

export default function InvoicesLoading() {
    return <SkeletonPage tableRows={8} tableColumns={6} />;
}
