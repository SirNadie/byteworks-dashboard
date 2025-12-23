import { SkeletonPage } from '@/components/ui/Skeleton';

export default function ClientsLoading() {
    return <SkeletonPage tableRows={8} tableColumns={5} />;
}
