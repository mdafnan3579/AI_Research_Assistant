import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { 
  Upload, 
  FileText, 
  Lightbulb, 
  Clock, 
  TrendingUp,
  ArrowRight,
  Mic,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DashboardStats {
  totalTranscripts: number;
  totalInsights: number;
  totalDuration: number;
  recentTranscripts: any[];
}

const Dashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalTranscripts: 0,
    totalInsights: 0,
    totalDuration: 0,
    recentTranscripts: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;

      try {
        // Fetch transcripts count and recent transcripts
        const { data: transcripts, error: transcriptsError } = await supabase
          .from('transcripts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (transcriptsError) throw transcriptsError;

        // Fetch insights count
        const { data: insights, error: insightsError } = await supabase
          .from('insights')
          .select('id')
          .eq('user_id', user.id);

        if (insightsError) throw insightsError;

        // Calculate total duration
        const totalDuration = transcripts?.reduce((sum, transcript) => 
          sum + (transcript.audio_duration || 0), 0
        ) || 0;

        setStats({
          totalTranscripts: transcripts?.length || 0,
          totalInsights: insights?.length || 0,
          totalDuration,
          recentTranscripts: transcripts || []
        });
      } catch (error) {
        toast({
          title: "Error loading dashboard",
          description: "Failed to load dashboard data. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, toast]);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">Welcome back!</h1>
        <p className="text-muted-foreground">
          Here's what's happening with your research today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-gradient-card border-0 shadow-card hover:shadow-hover transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transcripts</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.totalTranscripts}</div>
            <p className="text-xs text-muted-foreground">
              Research interviews processed
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-card hover:shadow-hover transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Insights</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.totalInsights}</div>
            <p className="text-xs text-muted-foreground">
              AI-generated insights
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-card hover:shadow-hover transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{formatDuration(stats.totalDuration)}</div>
            <p className="text-xs text-muted-foreground">
              Audio content analyzed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gradient-primary text-white border-0 shadow-premium hover:shadow-hover transition-all duration-300">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 rounded-lg p-2">
                <Upload className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>Upload New Interview</CardTitle>
                <CardDescription className="text-white/80">
                  Start analyzing a new research interview
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link to="/upload">
              <Button variant="secondary" className="w-full">
                Upload Audio File
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-gradient-secondary text-white border-0 shadow-premium hover:shadow-hover transition-all duration-300">
          <CardHeader>
            <div className="flex items-center space-x-3">
              <div className="bg-white/20 rounded-lg p-2">
                <BarChart3 className="h-6 w-6" />
              </div>
              <div>
                <CardTitle>View Analytics</CardTitle>
                <CardDescription className="text-white/80">
                  Analyze trends across all your research
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Link to="/insights">
              <Button variant="outline" className="w-full border-white text-white hover:bg-white hover:text-secondary">
                View Insights
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transcripts */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Transcripts</CardTitle>
              <CardDescription>
                Your latest research interviews
              </CardDescription>
            </div>
            <Link to="/transcripts">
              <Button variant="outline" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {stats.recentTranscripts.length === 0 ? (
            <div className="text-center py-8">
              <Mic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No transcripts yet</h3>
              <p className="text-muted-foreground mb-4">
                Upload your first research interview to get started
              </p>
              <Link to="/upload">
                <Button variant="premium">
                  Upload First Interview
                  <Upload className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {stats.recentTranscripts.map((transcript) => (
                <div key={transcript.id} className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-accent transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="bg-primary/10 rounded-lg p-2">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">{transcript.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(transcript.created_at)} • {formatDuration(transcript.audio_duration || 0)}
                      </p>
                    </div>
                  </div>
                  <Link to={`/transcripts/${transcript.id}`}>
                    <Button variant="ghost" size="sm">
                      View
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;