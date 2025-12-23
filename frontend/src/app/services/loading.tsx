import { SkeletonPage } from '@/components/ui/Skeleton';

export default function ServicesLoading() {
    return <SkeletonPage tableRows={6} tableColumns={5} />;
}
