import { diningToday } from "../../lib/diningDate";
interface Slot { time:string; availableSeats:number; isAvailable:boolean }
interface BookingWidgetProps {
  restaurant:{ totalSeats?:number } | null;
  selectedDate:string; setSelectedDate:(value:string) => void;
  selectedGuests:string; setSelectedGuests:(value:string) => void;
  selectedSlot:string; setSelectedSlot:(value:string) => void;
  slotsAvailability:Slot[]; loadingSlots:boolean; availabilityError?:string;
  isAuthenticated:boolean; handleReserveClick:() => void;
}
export default function BookingWidget(props: BookingWidgetProps) {
  const { restaurant, selectedDate, setSelectedDate, selectedGuests, setSelectedGuests, selectedSlot, setSelectedSlot, slotsAvailability, loadingSlots, availabilityError, isAuthenticated, handleReserveClick } = props;
  if (!restaurant) return null;
  const available = slotsAvailability.some(s => s.time === selectedSlot && s.isAvailable && s.availableSeats >= Number(selectedGuests));
  const maxDate = new Date(`${diningToday()}T00:00:00Z`);
  maxDate.setUTCDate(maxDate.getUTCDate() + 90);
  return <div className="bg-white border border-outline-variant/20 p-6 rounded-md shadow-sm text-left">
    <h3 className="font-display text-lg font-medium text-primary mb-4">Book a Table</h3>
    <div className="space-y-4">
      <label className="block text-xs">Party size
        <input aria-label="Party size" type="number" min={1} max={restaurant.totalSeats || 1} step={1} value={selectedGuests} onChange={e => {setSelectedGuests(e.target.value); setSelectedSlot("");}} className="block w-full border p-3 rounded-md mt-1" />
      </label>
      <label className="block text-xs">Date (Asia/Dhaka)
        <input aria-label="Dining date" type="date" value={selectedDate} min={diningToday()} max={maxDate.toISOString().slice(0,10)} onChange={e => {setSelectedDate(e.target.value); setSelectedSlot("");}} className="block w-full border p-3 rounded-md mt-1" />
      </label>
      <p className="text-xs">Available times (Asia/Dhaka)</p>
      {loadingSlots ? <p role="status">Loading availability...</p> : availabilityError ? <p role="alert">{availabilityError}</p> : <div className="grid grid-cols-3 gap-2">
        {slotsAvailability.map(s => {
          const full = !s.isAvailable || s.availableSeats < Number(selectedGuests) || !Number.isInteger(Number(selectedGuests)) || Number(selectedGuests) < 1;
          return <button key={s.time} type="button" disabled={full} aria-pressed={selectedSlot === s.time} onClick={() => setSelectedSlot(s.time)} className={`p-2 border rounded-sm text-xs disabled:opacity-40 ${selectedSlot === s.time ? "bg-secondary text-white" : "text-primary"}`}>
            {s.time}<span className="block text-[10px]">{full ? "Unavailable" : `${s.availableSeats} seats`}</span>
          </button>;
        })}
        {slotsAvailability.length === 0 && <p className="col-span-3 text-xs">No dining slots available.</p>}
      </div>}
      <button type="button" disabled={loadingSlots || !!availabilityError || !available || !Number.isInteger(Number(selectedGuests)) || Number(selectedGuests) < 1} onClick={handleReserveClick} className="w-full bg-primary text-white py-4 text-xs disabled:opacity-40">{isAuthenticated ? "RESERVE NOW" : "LOGIN TO RESERVE"}</button>
      <p className="text-center text-xs text-black/55">No reservation fee. Cancel a confirmed reservation from your dashboard.</p>
    </div>
  </div>;
}
