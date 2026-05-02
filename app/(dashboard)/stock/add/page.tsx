import AddVehicleForm from '@/components/stock/add-vehicle-form'

export const metadata = {
  title: 'Add Vehicle | ForecourIQ DMS',
}

export default function AddVehiclePage() {
  return (
    <div className="min-h-[calc(100vh-56px)] bg-void py-12 px-6">
      <AddVehicleForm />
    </div>
  )
}
