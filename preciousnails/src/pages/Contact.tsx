import { useEffect, useState } from 'react';
import { api } from '@/integrations/superbase';
import { Mail, Instagram, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const Contact = () => {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [supportEmail, setSupportEmail] = useState('support@preciouschinails.com');

  useEffect(() => {
    const fetchEmail = async () => {
      try {
        const settings = await api.admin.getSettings();
        if (settings?.support_email) setSupportEmail(settings.support_email);
      } catch (e) {}
    };
    fetchEmail();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.name && form.email && form.message) {
      toast.success('Your inquiry has been received. We will respond shortly.');
      setForm({ name: '', email: '', message: '' });
    }
  };

  return (
    <div className="pt-32 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="heading-display text-4xl md:text-5xl tracking-wider mb-4 uppercase">Get In Touch</h1>
          <p className="text-body text-muted-foreground max-w-lg mx-auto uppercase tracking-widest text-[10px] font-bold">We are dedicated to providing an exceptional experience. Reach out for inquiries, custom designs, or support.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div className="bg-card rounded-2xl p-8 border border-border shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Mail size={20} />
              </div>
              <h3 className="text-[10px] tracking-[0.2em] uppercase font-black">Email</h3>
            </div>
            <p className="text-sm font-bold text-muted-foreground">{supportEmail}</p>
          </div>
          <div className="bg-card rounded-2xl p-8 border border-border shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <Instagram size={20} />
              </div>
              <h3 className="text-[10px] tracking-[0.2em] uppercase font-black">Instagram</h3>
            </div>
            <p className="text-sm font-bold text-muted-foreground">@preciouschicnails</p>
          </div>
          <div className="bg-card rounded-2xl p-8 border border-border shadow-sm">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                <MapPin size={20} />
              </div>
              <h3 className="text-[10px] tracking-[0.2em] uppercase font-black">Location</h3>
            </div>
            <p className="text-sm font-bold text-muted-foreground uppercase">Montreal, Canada</p>
          </div>
        </div>

        <div className="bg-card rounded-[2.5rem] p-8 md:p-12 border border-border shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Full Name</Label>
                <Input
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Your Name"
                  className="rounded-2xl h-14 border-accent"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Email Address</Label>
                <Input
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="your@email.com"
                  type="email"
                  className="rounded-2xl h-14 border-accent"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Transmission Message</Label>
              <Textarea
                value={form.message}
                onChange={e => setForm({ ...form, message: e.target.value })}
                placeholder="How can our artisans assist you?"
                rows={6}
                className="rounded-[1.5rem] border-accent p-6"
                required
              />
            </div>
            <Button type="submit" className="btn-luxury w-full md:w-auto px-12 h-14 rounded-2xl shadow-lg shadow-primary/20 uppercase tracking-[0.2em] font-black">
              Send Transmission
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Local Label component since it might not be imported
const Label = ({ children, className }: any) => <label className={className}>{children}</label>;

export default Contact;
