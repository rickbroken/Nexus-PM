import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import Alert from '@/lib/alert';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      Alert.error('Error', 'Por favor completa todos los campos');
      return;
    }

    try {
      const userData = await signIn(email, password);
      toast.success('¡Bienvenido!', {
        description: 'Sesión iniciada correctamente',
      });
      // Redireccionar según el rol
      let redirectPath = '/projects'; // Default para admin
      if (userData?.role === 'dev') {
        redirectPath = '/my-tasks';
      } else if (userData?.role === 'pm') {
        redirectPath = '/my-tasks';
      } else if (userData?.role === 'advisor') {
        redirectPath = '/finances';
      }
      navigate(redirectPath);
    } catch (error: any) {
      Alert.error('Error de autenticación', error.message || 'Credenciales inválidas');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 p-4">
      <div className="w-full max-w-md">
        {/* Login Form */}
        <Card className="w-full">
          <CardHeader className="space-y-1">
            <div className="flex items-center justify-center mb-4">
              <div className="h-12 w-12 rounded-lg bg-zinc-900 flex items-center justify-center">
                <span className="text-white font-bold text-xl">N</span>
              </div>
            </div>
            <CardTitle className="text-2xl text-center">NexusPM</CardTitle>
            <CardDescription className="text-center">
              Ingresa tus credenciales para acceder al sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}