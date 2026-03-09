import { useEffect, useState } from 'react';
import { api } from '@/integrations/superbase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save, Lock, Shield, Mail, Headphones } from 'lucide-react';

const SiteSettings = () => {
  const [supportEmail, setSupportEmail] = useState('support@preciouschinails.com');
  const [adminRoute, setAdminRoute] = useState('admin');
  const [adminEmail, setAdminEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpHost, setSmtpHost] = useState('');
  const [fromName, setFromName] = useState('');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await api.admin.getSettings();
        if (data) {
          setSmtpUser(data.active_smtp_user || '');
          setSmtpPass(data.smtp_password || '');
          setSmtpHost(data.smtp_host || '');
          setFromName(data.from_name || '');
          setAdminRoute(data.admin_route || 'admin');
          setAdminEmail(data.admin_email || '');
          setSupportEmail(data.support_email || 'support@preciouschinails.com');
        }
      } catch (err) {
        console.error('Fetch settings failed:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      if (newPassword && newPassword !== confirmPassword) {
        toast.error('Passwords do not match');
        setSaving(false);
        return;
      }

      await api.admin.updateSettings({
        active_smtp_user: smtpUser,
        smtp_password: smtpPass,
        smtp_host: smtpHost,
        from_name: fromName,
        admin_route: adminRoute,
        admin_email: adminEmail,
        support_email: supportEmail,
        admin_password: newPassword || undefined,
      });
      
      if (newPassword) {
        setNewPassword('');
        setConfirmPassword('');
        if (localStorage.getItem('superbase_api_key') === 'Titobilove123@') {
            localStorage.setItem('superbase_api_key', newPassword);
        }
      }

      toast.success('Settings saved!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading settings...</div>;

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="heading-display text-2xl tracking-wider uppercase">System Config</h1>
        <p className="text-body text-muted-foreground mt-1 text-xs font-bold uppercase tracking-widest">Global Boutique Parameters</p>
      </div>

      <div className="max-w-2xl space-y-8 pb-12">
        {/* Customer Support */}
        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Headphones size={20} />
            </div>
            <h2 className="heading-display text-lg tracking-wider uppercase">Customer Support</h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">Public Support Email</Label>
              <Input
                value={supportEmail}
                onChange={e => setSupportEmail(e.target.value)}
                className="rounded-xl mt-1 h-12 border-accent"
                placeholder="support@preciouschinails.com"
              />
              <p className="text-[10px] text-muted-foreground mt-2 font-medium">This email is displayed to customers on the Contact and Dashboard pages.</p>
            </div>
          </div>
        </div>

        {/* SMTP Settings */}
        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Mail size={20} />
            </div>
            <h2 className="heading-display text-lg tracking-wider uppercase">Email Dispatch (SMTP)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">Sender Identity Name</Label>
                <Input value={fromName} onChange={e => setFromName(e.target.value)} className="rounded-xl mt-1 h-12 border-accent" />
            </div>
            <div>
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">SMTP Host</Label>
                <Input value={smtpHost} onChange={e => setSmtpHost(e.target.value)} className="rounded-xl mt-1 h-12 border-accent" />
            </div>
            <div>
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">SMTP Authenticated User</Label>
                <Input value={smtpUser} onChange={e => setSmtpUser(e.target.value)} className="rounded-xl mt-1 h-12 border-accent" />
            </div>
            <div className="md:col-span-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">SMTP Access Token (Password)</Label>
                <Input type="password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} className="rounded-xl mt-1 h-12 border-accent" />
            </div>
          </div>
        </div>

        {/* Security / Admin Path */}
        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Shield size={20} />
            </div>
            <h2 className="heading-display text-lg tracking-wider uppercase">Security & Routing</h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">Stealth Admin Route</Label>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground font-mono">/</span>
                <Input
                  value={adminRoute}
                  onChange={e => setAdminRoute(e.target.value.replace(/[^a-z0-9-]/gi, '').toLowerCase())}
                  className="rounded-xl h-12 border-accent"
                  placeholder="admin"
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 font-medium">Changing this obfuscates the administrative interface at a new URL segment.</p>
            </div>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-card rounded-2xl border border-border p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
              <Lock size={20} />
            </div>
            <h2 className="heading-display text-lg tracking-wider uppercase">Authentication Override</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">New Credential</Label>
              <Input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="rounded-xl mt-1 h-12 border-accent"
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1 block">Confirm Override</Label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="rounded-xl mt-1 h-12 border-accent"
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        <Button onClick={save} className="btn-luxury h-14 px-12 rounded-2xl w-full md:w-auto shadow-lg shadow-primary/20" disabled={saving}>
          <Save size={18} className="mr-2" /> {saving ? 'Transmitting...' : 'Commit Configuration'}
        </Button>
      </div>
    </div>
  );
};

export default SiteSettings;
