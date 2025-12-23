import { SkeletonPage } from '@/components/ui/Skeleton';

export default function QuotesLoading() {
    return <SkeletonPage tableRows={8} tableColumns={6} />;
}
