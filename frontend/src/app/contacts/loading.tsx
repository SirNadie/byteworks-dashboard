import { SkeletonPage } from '@/components/ui/Skeleton';

export default function ContactsLoading() {
    return <SkeletonPage tableRows={8} tableColumns={5} />;
}
