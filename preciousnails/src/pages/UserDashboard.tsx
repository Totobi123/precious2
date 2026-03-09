import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/integrations/superbase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Package, MapPin, Truck, ExternalLink, 
  Bell, MessageSquare, Clock, ChevronRight,
  CheckCircle2, AlertCircle, ShoppingBag, Send,
  User as UserIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

type Order = any;
type OrderItem = any;
type Notification = {
  id: number;
  user_email?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  created_at: string;
  read: boolean;
};

type Message = {
  id: number;
  sender: 'admin' | 'user';
  text: string;
  created_at: string;
};

const statusLabels: Record<string, string> = {
  pending: 'Pending',
  processing: 'Processing',
  hand_making: 'Hand-making',
  quality_check: 'Quality Check',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
};

const statusSteps = [
  { key: 'pending', label: 'Order Placed' },
  { key: 'processing', label: 'Processing' },
  { key: 'hand_making', label: 'Crafting' },
  { key: 'quality_check', label: 'Quality Check' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' }
];

const UserDashboard = () => {
  const { user, signOut } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [activeTab, setActiveTab] = useState('orders');
  const [supportEmail, setSupportEmail] = useState('support@preciouschinails.com');

  const fetchDashboardData = async () => {
    if (!user) return;
    const userEmail = localStorage.getItem('user_email') || user.email;
    
    try {
      // Fetch Settings
      const settings = await api.admin.getSettings();
      if (settings?.support_email) setSupportEmail(settings.support_email);

      // Fetch Orders
      const ordersData = await api.data.getAll('orders');
      if (ordersData) {
        setOrders(ordersData.filter((o: any) => o.customer_email === userEmail));
      }

      // Fetch Notifications
      const notifsData = await api.data.getAll('notifications');
      if (notifsData && Array.isArray(notifsData)) {
        const filtered = notifsData.filter((n: any) => n.user_email === userEmail);
        setNotifications(filtered.length > 0 ? filtered : [{
          id: 1,
          title: "Welcome!",
          message: "Thank you for joining Precious Chic Nails.",
          type: 'success',
          created_at: new Date().toISOString(),
          read: false
        }]);
      }

      // Fetch Chat
      const chatData = await api.data.getChatMessages(userEmail);
      if (chatData && Array.isArray(chatData)) {
        setMessages(chatData);
      }
    } catch (err) {
      console.error('Fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const handleOpenOrder = async (order: any) => {
    setSelectedOrder(order);
    setOrderItems([]);
    try {
      const data = await api.data.getAll('order_items');
      if (data) {
        setOrderItems(data.filter((item: any) => item.order_id === order.id));
      }
    } catch (err) {
      console.error('Fetch items failed:', err);
    }
  };

  const markNotificationRead = async (id: number) => {
    try {
      await api.data.update('notifications', id.toString(), { read: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (e) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;
    const userEmail = localStorage.getItem('user_email') || user.email;
    try {
      await api.data.sendChatMessage({
        user_email: userEmail,
        sender: 'user',
        text: newMessage.trim()
      });
      setNewMessage('');
      fetchDashboardData();
    } catch (e) {
      toast.error('Failed to send message');
    }
  };

  const getCurrentStatusIndex = (status: string) => {
    const idx = statusSteps.findIndex(step => step.key === status);
    return idx === -1 ? 0 : idx;
  };

  if (!user) return (
    <div className="pt-32 pb-20 min-h-screen text-center px-6">
      <h1 className="heading-display text-2xl mb-4 uppercase tracking-widest">Identification Required</h1>
      <Button className="btn-luxury px-12" onClick={() => window.location.href = '/auth'}>Sign In</Button>
    </div>
  );

  return (
    <div className="pt-32 pb-20 min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-6">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 border-b border-border pb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="heading-display text-3xl md:text-4xl tracking-wider uppercase">User Vault</h1>
              {notifications.some(n => !n.read) && (
                <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
              )}
            </div>
            <p className="text-muted-foreground text-[10px] font-black uppercase tracking-[0.2em]">{user.email}</p>
          </div>
          <Button variant="outline" className="rounded-xl border-border text-[10px] font-black uppercase tracking-widest px-6" onClick={signOut}>Sign Out</Button>
        </div>

        <Tabs defaultValue="orders" className="space-y-8" onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <TabsList className="bg-accent/30 p-1 rounded-2xl border border-border">
              <TabsTrigger value="orders" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background text-[10px] font-black uppercase tracking-widest">
                <ShoppingBag size={14} className="mr-2" /> Orders
              </TabsTrigger>
              <TabsTrigger value="notifications" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background relative text-[10px] font-black uppercase tracking-widest">
                <Bell size={14} className="mr-2" /> Updates
                {notifications.some(n => !n.read) && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[8px] text-white font-bold">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="messages" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background text-[10px] font-black uppercase tracking-widest">
                <MessageSquare size={14} className="mr-2" /> Liaison
              </TabsTrigger>
              <TabsTrigger value="account" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-background text-[10px] font-black uppercase tracking-widest">
                <UserIcon size={14} className="mr-2" /> Profile
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Orders Tab */}
          <TabsContent value="orders" className="space-y-4">
            {loading ? <div className="h-24 bg-accent/20 rounded-2xl animate-pulse" /> : orders.length === 0 ? (
              <div className="text-center py-20 bg-accent/5 rounded-[2rem] border border-dashed border-border">
                <Package size={32} className="mx-auto mb-4 opacity-20 text-primary" />
                <h3 className="text-sm font-black uppercase tracking-widest mb-2">No acquisitions found</h3>
                <Button className="btn-luxury px-10" onClick={() => window.location.href = '/collections/all'}>Curate Collection</Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {orders.map(order => (
                  <div key={order.id} onClick={() => handleOpenOrder(order)} className="group bg-card border border-border p-6 rounded-[1.5rem] hover:border-primary/40 cursor-pointer transition-all shadow-sm">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <Package size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-black uppercase tracking-tighter">Order #{order.order_number}</p>
                          <p className="text-[10px] text-muted-foreground font-bold uppercase">{new Date(order.created_at).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <div className="text-right">
                          <p className="text-sm font-black text-primary">${order.total}</p>
                          <Badge variant="outline" className="text-[8px] uppercase tracking-widest font-black border-primary/20 text-primary">{order.status}</Badge>
                        </div>
                        <ChevronRight size={16} className="text-muted-foreground group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-4">
            <div className="bg-card border border-border rounded-[2rem] overflow-hidden divide-y divide-border shadow-sm">
              {notifications.map(notif => (
                <div key={notif.id} onClick={() => !notif.read && markNotificationRead(notif.id)} className={cn("p-8 flex gap-6 transition-colors cursor-pointer", !notif.read && "bg-primary/[0.02]")}>
                  <div className={cn("mt-1 w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", notif.type === 'success' ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary")}>
                    <Bell size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className={cn("text-sm font-black uppercase tracking-widest", !notif.read && "text-primary")}>{notif.title}</h4>
                      <span className="text-[9px] text-muted-foreground font-mono font-bold">{new Date(notif.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-medium leading-relaxed">{notif.message}</p>
                    {!notif.read && <Badge className="mt-3 bg-primary text-white border-none text-[8px] font-black tracking-widest uppercase">New</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <div className="bg-card border border-border rounded-[2.5rem] overflow-hidden h-[600px] flex flex-col shadow-xl">
              <div className="p-6 border-b border-border bg-accent/20 flex items-center gap-4">
                <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center text-white shadow-lg shadow-primary/20">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-[0.2em]">Support Liaison</h3>
                  <p className="text-[9px] text-green-600 font-bold uppercase flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Live Connectivity
                  </p>
                </div>
              </div>
              <ScrollArea className="flex-1 p-8 space-y-6 bg-accent/[0.03]">
                <div className="space-y-6">
                  {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex flex-col max-w-[85%]", msg.sender === 'user' ? "ml-auto items-end" : "items-start")}>
                      <div className={cn("p-5 rounded-[1.5rem] text-sm font-medium shadow-sm leading-relaxed", msg.sender === 'user' ? "bg-primary text-white rounded-tr-none" : "bg-white border border-border rounded-tl-none")}>
                        {msg.text}
                      </div>
                      <span className="text-[8px] text-muted-foreground mt-2 px-1 font-bold uppercase tracking-tighter opacity-60">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-6 border-t border-border bg-white">
                <div className="text-center mb-4">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Direct Inquiry: <span className="text-primary">{supportEmail}</span></p>
                </div>
                <div className="relative flex gap-3">
                  <Input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMessage()} placeholder="Compose secure transmission..." className="rounded-[1.5rem] h-14 pr-14 border-accent focus-visible:ring-primary/20 text-sm shadow-inner font-medium" />
                  <Button onClick={sendMessage} size="icon" className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl shadow-lg shadow-primary/20"><Send size={18} /></Button>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Account Tab */}
          <TabsContent value="account" className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-card border border-border p-10 rounded-[2rem] space-y-6 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-3"><UserIcon size={16} className="text-primary" /> Core Profile</h3>
              <div>
                <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground mb-1">Authenticated Identity</p>
                <p className="text-sm font-black">{user.email}</p>
              </div>
              <Badge className="bg-green-500/10 text-green-600 border-none uppercase text-[9px] font-black tracking-widest px-3 py-1">Identity Verified</Badge>
            </div>
            <div className="bg-card border border-border p-10 rounded-[2rem] space-y-6 shadow-sm">
              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground flex items-center gap-3"><MapPin size={16} className="text-primary" /> Delivery Grid</h3>
              <p className="text-xs text-muted-foreground font-medium leading-relaxed">Your curated destinations are securely archived for future acquisitions.</p>
              <Button variant="outline" className="w-full rounded-2xl h-12 text-[10px] font-black uppercase tracking-[0.2em] border-accent hover:bg-primary hover:text-white transition-all">Manage Directory</Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Order Details Modal */}
        <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl p-0 border-none rounded-[2rem] overflow-hidden shadow-2xl">
            {selectedOrder && (
              <div className="bg-background">
                <div className="bg-black p-10 text-white">
                  <DialogTitle className="heading-display tracking-[0.2em] text-2xl uppercase mb-4">Transmission #{selectedOrder.order_number}</DialogTitle>
                  <div className="flex gap-4">
                    <span className="bg-white/10 px-4 py-2 rounded-full border border-white/10 text-[9px] font-black uppercase tracking-widest">Registry Date: {new Date(selectedOrder.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="p-10 space-y-10">
                  {/* Status Visualization */}
                  <div className="relative pt-4 pb-10">
                    <div className="absolute top-7 left-0 w-full h-1 bg-accent/50 rounded-full" />
                    <div className="absolute top-7 left-0 h-1 bg-primary rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(234,179,8,0.4)]" style={{ width: `${(getCurrentStatusIndex(selectedOrder.status) / (statusSteps.length - 1)) * 100}%` }} />
                    <div className="relative flex justify-between">
                      {statusSteps.map((step, idx) => {
                        const isDone = getCurrentStatusIndex(selectedOrder.status) >= idx;
                        return (
                          <div key={step.key} className="flex flex-col items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-full border-4 flex items-center justify-center transition-all duration-500", isDone ? "bg-primary border-primary/20 text-white shadow-lg shadow-primary/20" : "bg-background border-accent text-muted-foreground/30")}>
                              {isDone ? <CheckCircle2 size={16} /> : <div className="w-1.5 h-1.5 rounded-full bg-current" />}
                            </div>
                            <span className={cn("text-[8px] font-black uppercase tracking-widest text-center max-w-[60px]", isDone ? "text-foreground" : "text-muted-foreground/40")}>{step.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Acquisition Inventory</h3>
                    <div className="grid gap-4">
                      {orderItems.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-6 bg-accent/10 p-5 rounded-[1.5rem] border border-border/40 group hover:border-primary/20 transition-all">
                          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white border border-border shadow-sm">
                            <img src={item.product_image || '/placeholder.svg'} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-black text-sm uppercase tracking-tight">{item.product_name}</h4>
                            <div className="flex gap-3 mt-2">
                              <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-widest px-2.5 h-5 bg-background">Size: {item.size}</Badge>
                              <Badge variant="secondary" className="text-[8px] font-black uppercase tracking-widest px-2.5 h-5 bg-background">Qty: {item.quantity}</Badge>
                            </div>
                          </div>
                          <p className="font-black text-sm text-primary">${item.price}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-accent/5 p-8 rounded-[2rem] border border-border/50 flex justify-between items-center shadow-inner">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Total Valuation</span>
                    <span className="text-3xl font-black text-primary">${selectedOrder.total}</span>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default UserDashboard;
