import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  FileText, 
  Clock, 
  Eye, 
  Upload,
  Calendar,
  Lightbulb,
  ArrowRight
} from 'lucide-react';

interface Transcript {
  id: string;
  title: string;
  file_name: string;
  transcript_text: string | null;
  audio_duration: number | null;
  processed_at: string | null;
  created_at: string;
  insights?: { id: string; tags: string[] }[];
}

const Transcripts = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [filteredTranscripts, setFilteredTranscripts] = useState<Transcript[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchTranscripts = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('transcripts')
          .select(`
            *,
            insights(id, tags)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        setTranscripts(data || []);
        setFilteredTranscripts(data || []);
      } catch (error) {
        console.error('Error fetching transcripts:', error);
        toast({
          title: "Error loading transcripts",
          description: "Failed to load your transcripts. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTranscripts();
  }, [user, toast]);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredTranscripts(transcripts);
      return;
    }

    const filtered = transcripts.filter(transcript =>
      transcript.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transcript.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transcript.transcript_text && 
       transcript.transcript_text.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    setFilteredTranscripts(filtered);
  }, [searchTerm, transcripts]);

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'Unknown';
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (transcript: Transcript) => {
    if (!transcript.processed_at) {
      return <Badge variant="secondary">Processing</Badge>;
    }
    if (!transcript.transcript_text) {
      return <Badge variant="destructive">Failed</Badge>;
    }
    return <Badge variant="default">Ready</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-10 bg-muted rounded mb-6"></div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transcripts</h1>
          <p className="text-muted-foreground">
            View and manage your research interview transcripts
          </p>
        </div>
        <Link to="/upload">
          <Button variant="hero" className="flex items-center space-x-2">
            <Upload className="h-4 w-4" />
            <span>Upload New</span>
          </Button>
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search transcripts by title, filename, or content..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-card border-0 shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">{transcripts.length}</p>
                <p className="text-sm text-muted-foreground">Total Transcripts</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-success" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {formatDuration(transcripts.reduce((sum, t) => sum + (t.audio_duration || 0), 0))}
                </p>
                <p className="text-sm text-muted-foreground">Total Duration</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-0 shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Lightbulb className="h-5 w-5 text-warning" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {transcripts.reduce((sum, t) => sum + (t.insights?.length || 0), 0)}
                </p>
                <p className="text-sm text-muted-foreground">Generated Insights</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transcripts List */}
      {filteredTranscripts.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            {transcripts.length === 0 ? (
              <div className="space-y-4">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-medium text-foreground">No transcripts yet</h3>
                  <p className="text-muted-foreground">
                    Upload your first research interview to get started
                  </p>
                </div>
                <Link to="/upload">
                  <Button variant="premium">
                    Upload First Interview
                    <Upload className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                <Search className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="text-lg font-medium text-foreground">No results found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search terms
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSearchTerm('')}
                >
                  Clear Search
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTranscripts.map((transcript) => (
            <Card key={transcript.id} className="shadow-card hover:shadow-hover transition-all duration-300">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-3">
                      <CardTitle className="text-lg">{transcript.title}</CardTitle>
                      {getStatusBadge(transcript)}
                    </div>
                    <CardDescription className="flex items-center space-x-4 text-sm">
                      <span className="flex items-center space-x-1">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(transcript.created_at)}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Clock className="h-4 w-4" />
                        <span>{formatDuration(transcript.audio_duration)}</span>
                      </span>
                      <span className="text-muted-foreground">{transcript.file_name}</span>
                    </CardDescription>
                  </div>
                  <Link to={`/transcripts/${transcript.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              
              {transcript.transcript_text && (
                <CardContent>
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {transcript.transcript_text.substring(0, 200)}...
                    </p>
                    
                    {transcript.insights && transcript.insights.length > 0 && (
                      <div className="flex items-center space-x-2">
                        <Lightbulb className="h-4 w-4 text-warning" />
                        <span className="text-sm text-muted-foreground">
                          {transcript.insights.length} insight{transcript.insights.length !== 1 ? 's' : ''} available
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {transcript.insights[0]?.tags?.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-end">
                      <Link to={`/transcripts/${transcript.id}`}>
                        <Button variant="ghost" size="sm">
                          Read More
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Transcripts;