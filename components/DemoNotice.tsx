// AfyaLink is a student project. On a public link, someone could mistake it
// for a real medical service, so the public pages say clearly that it isn't.
export default function DemoNotice() {
  return (
    <p className="demo-bar" role="note">
      <strong>Student demo.</strong> AfyaLink is a USIU-Africa project, not a real medical service. Please use made-up
      names and symptoms. Payments use the M-Pesa test system (sandbox).
    </p>
  );
}
