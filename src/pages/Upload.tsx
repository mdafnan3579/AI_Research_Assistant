import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Upload as UploadIcon, File, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Upload = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        // Auto-generate title from filename
        const nameWithoutExt = selectedFile.name.replace(/\.[^/.]+$/, "");
        setTitle(nameWithoutExt.replace(/[-_]/g, ' '));
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!file || !title || !user) {
      toast({
        title: "Missing Information",
        description: "Please select a file and provide a title.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      // Create transcript record first
      const { data: transcript, error: transcriptError } = await supabase
        .from('transcripts')
        .insert({
          user_id: user.id,
          title: title.trim(),
          file_name: file.name,
        })
        .select()
        .single();

      if (transcriptError) {
        throw new Error(`Failed to create transcript record: ${transcriptError.message}`);
      }

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${transcript.id}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(fileName, file);

      if (uploadError) {
        // Clean up transcript record if upload fails
        await supabase.from('transcripts').delete().eq('id', transcript.id);
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      setUploading(false);
      setProcessing(true);

      toast({
        title: "File uploaded successfully!",
        description: "Processing your audio file for transcription...",
      });

      // Trigger processing
      const { error: processError } = await supabase.functions.invoke('process-audio', {
        body: { transcriptId: transcript.id }
      });

      if (processError) {
        console.error('Processing error:', processError);
        toast({
          title: "Processing Error",
          description: "Audio uploaded but processing failed. Please try again later.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Processing Complete!",
          description: "Your transcript and insights are ready for review.",
        });
      }

      setProcessing(false);
      
      // Navigate to the transcript page
      navigate(`/transcripts/${transcript.id}`);

    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
      setUploading(false);
      setProcessing(false);
    }
  };

  const isProcessingStep = processing || uploading;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold text-foreground">Upload Research Interview</h1>
        <p className="text-muted-foreground">
          Upload your audio file to get AI-powered transcription and insights
        </p>
      </div>

      {/* Upload Form */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <UploadIcon className="h-5 w-5 text-primary" />
            <span>Audio File Upload</span>
          </CardTitle>
          <CardDescription>
            Supported formats: MP3, WAV, M4A, MP4. Maximum file size: 500MB
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-6">
            {/* Title Input */}
            <div className="space-y-2">
              <Label htmlFor="title">Interview Title</Label>
              <Input
                id="title"
                type="text"
                placeholder="e.g., Client Interview - Tech Startup A"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={isProcessingStep}
              />
            </div>

            {/* File Upload */}
            <div className="space-y-2">
              <Label htmlFor="file">Audio File</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors">
                <input
                  id="file"
                  type="file"
                  accept="audio/*,video/*,.mp3,.wav,.m4a,.mp4,.mov,.avi"
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={isProcessingStep}
                />
                <label htmlFor="file" className="cursor-pointer block">
                  {file ? (
                    <div className="space-y-2">
                      <File className="h-8 w-8 text-success mx-auto" />
                      <p className="font-medium text-foreground">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      {!isProcessingStep && (
                        <p className="text-xs text-primary">Click to change file</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <UploadIcon className="h-8 w-8 text-muted-foreground mx-auto" />
                      <p className="font-medium text-foreground">
                        Drop your audio file here or click to browse
                      </p>
                      <p className="text-sm text-muted-foreground">
                        MP3, WAV, M4A, MP4 up to 500MB
                      </p>
                    </div>
                  )}
                </label>
              </div>
            </div>

            {/* Upload Button */}
            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="w-full"
              disabled={!file || !title || isProcessingStep}
            >
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {uploading ? 'Uploading...' : processing ? 'Processing...' : 'Upload & Process'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Processing Status */}
      {(uploading || processing) && (
        <Card className="bg-primary-light border-primary shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <p className="font-medium text-foreground">
                  {uploading ? 'Uploading your file...' : 'Processing with AI...'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {uploading 
                    ? 'Securely uploading your audio file to our servers'
                    : 'Generating transcript and extracting insights. This may take a few minutes.'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Help Section */}
      <Card className="bg-muted border-0">
        <CardHeader>
          <CardTitle className="text-lg">Upload Tips</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-success mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Best Quality Results</p>
              <p className="text-sm text-muted-foreground">
                Use clear audio with minimal background noise for better transcription accuracy
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-5 w-5 text-success mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Speaker Identification</p>
              <p className="text-sm text-muted-foreground">
                Our AI can distinguish between different speakers in your interview
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
            <div>
              <p className="font-medium text-foreground">Privacy & Security</p>
              <p className="text-sm text-muted-foreground">
                All files are encrypted and only accessible to you. We never share your data.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Upload;