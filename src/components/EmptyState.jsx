import { PackageOpen } from 'lucide-react';

export const EmptyState = ({ icon: Icon = PackageOpen, title = 'No data found', message = '', action }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="p-4 bg-gray-100 rounded-full mb-4">
      <Icon className="h-10 w-10 text-gray-400" />
    </div>
    <h3 className="text-base font-medium text-gray-700">{title}</h3>
    {message && <p className="text-sm text-gray-400 mt-1 max-w-sm">{message}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export default EmptyState;
