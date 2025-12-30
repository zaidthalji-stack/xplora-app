import React, { useState, useEffect, useRef } from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Dimensions, ScrollView, ActivityIndicator, Text, Platform } from 'react-native';
import { ChevronLeft, ChevronRight, ImageIcon, Play, Pause, Volume2, VolumeX, Box, RotateCw } from 'lucide-react-native';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { supabase } from '@/supabase/client';

// Platform-specific WebView import
let WebView: any = null;
if (Platform.OS === 'web') {
  // For web, we'll use iframe directly
  WebView = null;
} else {
  try {
    const RNWebView = require('react-native-webview');
    WebView = RNWebView.WebView;
  } catch (e) {
    console.log('WebView not available on this platform');
  }
}

interface PropertyImageCarouselProps {
  propertyId: string;
  height?: number;
  width?: number;
  showIndicators?: boolean;
  showControls?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
  borderRadius?: number;
  theme?: any;
  compact?: boolean;
  supportsVideo?: boolean; // NEW: Enable video support
}

interface ProcessedImage {
  id: number;
  url: string;
  order: number;
  type: 'image' | 'video' | 'model'; // NEW: Added 3D model type
}

/**
 * 🎨 Property Image Carousel with Video Support
 */
export const PropertyImageCarousel: React.FC<PropertyImageCarouselProps> = ({
  propertyId,
  height = 200,
  width,
  showIndicators = true,
  showControls = true,
  autoPlay = false,
  autoPlayInterval = 3000,
  borderRadius = 12,
  theme,
  compact = false,
  supportsVideo = false, // NEW: Default to false for backward compatibility
}) => {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // NEW: Video state - track per video
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [videoStatus, setVideoStatus] = useState<{ [key: number]: boolean }>({});
  const videoRefs = useRef<{ [key: number]: Video | null }>({});
  
  // NEW: 3D Model state
  const [modelRotation, setModelRotation] = useState(0);
  
  const scrollViewRef = useRef<ScrollView>(null);
  const autoPlayTimerRef = useRef<any>(null);
  
  const screenWidth = width || Dimensions.get('window').width;
  const imageWidth = compact ? screenWidth - 32 : screenWidth;

  useEffect(() => {
    fetchPropertyImages();
  }, [propertyId]);

  useEffect(() => {
    if (autoPlay && images.length > 1) {
      autoPlayTimerRef.current = setInterval(() => {
        goToNext();
      }, autoPlayInterval);

      return () => {
        if (autoPlayTimerRef.current) {
          clearInterval(autoPlayTimerRef.current);
        }
      };
    }
  }, [autoPlay, images.length, currentIndex]);

  // NEW: Reset video state when slide changes
  useEffect(() => {
    // Pause all videos when changing slides
    Object.keys(videoRefs.current).forEach(async (key) => {
      const videoRef = videoRefs.current[parseInt(key)];
      if (videoRef) {
        try {
          await videoRef.pauseAsync();
        } catch (e) {
          console.log('Error pausing video:', e);
        }
      }
    });
    setIsPlaying(false);
  }, [currentIndex]);

  // NEW: Helper function to detect media type
  const getMediaType = (url: string): 'image' | 'video' | 'model' => {
    if (!supportsVideo) return 'image';
    
    const lowerUrl = url.toLowerCase();
    
    // Check for 3D models
    if (lowerUrl.includes('.glb') || lowerUrl.includes('.gltf')) {
      return 'model';
    }
    
    // Check for videos
    const videoExtensions = ['.mp4', '.mov', '.avi', '.m4v', '.webm'];
    if (videoExtensions.some(ext => lowerUrl.includes(ext))) {
      return 'video';
    }
    
    // Default to image
    return 'image';
  };

  const fetchPropertyImages = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log(`\n🖼️  Fetching media for property: ${propertyId}`);

      // Use explicit column names with proper casing
      const { data, error: fetchError } = await supabase
        .from('property_images')
        .select(`
          "Image_ID",
          "Property_ID",
          "Image_URL",
          "Order",
          "Created_At"
        `)
        .eq('Property_ID', propertyId)
        .order('Order', { ascending: true });

      if (fetchError) {
        console.error('❌ Error fetching media:', fetchError);
        console.error('   Code:', fetchError.code);
        console.error('   Message:', fetchError.message);
        console.error('   Details:', fetchError.details);
        console.error('   Hint:', fetchError.hint);
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        console.log(`✅ Found ${data.length} database rows`);
        
        // Process the images/videos - handle multiple URLs in a single field
        const processedImages: ProcessedImage[] = [];
        
        data.forEach((row: any) => {
          const imageUrl = row.Image_URL || row.image_url; // Handle both cases
          
          if (!imageUrl) {
            console.warn('⚠️  Row missing Image_URL:', row);
            return;
          }
          
          // Check if the URL field contains multiple URLs (separated by newlines)
          if (imageUrl.includes('\n') || imageUrl.includes('\r')) {
            // Split by newlines and filter out empty strings
            const urls = imageUrl
              .split(/[\r\n]+/)
              .map((url: string) => url.trim())
              .filter((url: string) => url.length > 0 && url.startsWith('http'));
            
            console.log(`   📋 Found ${urls.length} URLs in single field`);
            
            // Add each URL as a separate image/video/model
            urls.forEach((url: string, idx: number) => {
              const type = getMediaType(url);
              processedImages.push({
                id: (row.Image_ID || row.image_id) * 1000 + idx,
                url: url,
                order: (row.Order || row.order || 0) * 1000 + idx,
                type: type,
              });
              if (type === 'video') {
                console.log(`   🎥 Video detected: ${url.substring(0, 60)}...`);
              } else if (type === 'model') {
                console.log(`   📦 3D Model detected: ${url.substring(0, 60)}...`);
              }
            });
          } else {
            // Single URL
            const type = getMediaType(imageUrl.trim());
            processedImages.push({
              id: row.Image_ID || row.image_id,
              url: imageUrl.trim(),
              order: row.Order || row.order || 0,
              type: type,
            });
            if (type === 'video') {
              console.log(`   🎥 Video detected: ${imageUrl.substring(0, 60)}...`);
            } else if (type === 'model') {
              console.log(`   📦 3D Model detected: ${imageUrl.substring(0, 60)}...`);
            }
          }
        });
        
        // Sort by order
        processedImages.sort((a, b) => a.order - b.order);
        
        const videoCount = processedImages.filter(m => m.type === 'video').length;
        const imageCount = processedImages.filter(m => m.type === 'image').length;
        const modelCount = processedImages.filter(m => m.type === 'model').length;
        console.log(`✅ Processed ${processedImages.length} items: ${imageCount} images, ${videoCount} videos, ${modelCount} 3D models`);
        
        setImages(processedImages);
      } else {
        console.log('ℹ️  No media found for this property');
        setImages([]);
      }

      setLoading(false);
    } catch (err: any) {
      console.error('❌ Unexpected error:', err);
      console.error('   Message:', err?.message);
      console.error('   Stack:', err?.stack);
      setError('Failed to load media');
      setLoading(false);
    }
  };

  const goToNext = () => {
    if (images.length === 0) return;
    
    const nextIndex = (currentIndex + 1) % images.length;
    setCurrentIndex(nextIndex);
    
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: nextIndex * imageWidth,
        animated: true,
      });
    }
  };

  const goToPrevious = () => {
    if (images.length === 0) return;
    
    const prevIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
    
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: prevIndex * imageWidth,
        animated: true,
      });
    }
  };

  const handleScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / imageWidth);
    setCurrentIndex(index);
  };

  const goToIndex = (index: number) => {
    setCurrentIndex(index);
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({
        x: index * imageWidth,
        animated: true,
      });
    }
  };

  // NEW: Video control functions with debugging
  const togglePlayPause = async () => {
    const currentVideo = videoRefs.current[currentIndex];
    const currentMedia = images[currentIndex];
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎬 togglePlayPause called');
    console.log('   Current index:', currentIndex);
    console.log('   Media type:', currentMedia?.type);
    console.log('   Media URL:', currentMedia?.url);
    console.log('   Video ref exists:', !!currentVideo);
    console.log('   All video refs:', Object.keys(videoRefs.current).map(k => `[${k}]: ${!!videoRefs.current[parseInt(k)]}`).join(', '));
    
    if (!currentVideo) {
      console.log('   ❌ No video ref found for current index');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      return;
    }

    try {
      const status = await currentVideo.getStatusAsync();
      console.log('   📹 Video status:', {
        isLoaded: status.isLoaded,
        isPlaying: status.isLoaded ? status.isPlaying : 'N/A',
        positionMillis: status.isLoaded ? status.positionMillis : 'N/A',
        durationMillis: status.isLoaded ? status.durationMillis : 'N/A',
      });
      
      if (!status.isLoaded) {
        console.log('   ⚠️ Video not loaded, attempting to load...');
        try {
          await currentVideo.loadAsync(
            { uri: currentMedia.url },
            { shouldPlay: true, isLooping: true, isMuted }
          );
          console.log('   ✅ Video loaded and playing');
          setIsPlaying(true);
        } catch (loadError) {
          console.error('   ❌ Failed to load video:', loadError);
        }
      } else if (status.isPlaying) {
        console.log('   ⏸️  Pausing video...');
        await currentVideo.pauseAsync();
        setIsPlaying(false);
        console.log('   ✅ Video paused');
      } else {
        console.log('   ▶️  Playing video...');
        await currentVideo.playAsync();
        setIsPlaying(true);
        console.log('   ✅ Video playing');
      }
    } catch (e) {
      console.error('   ❌ Error in togglePlayPause:', e);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  };

  const toggleMute = async () => {
    const currentVideo = videoRefs.current[currentIndex];
    console.log('🔊 toggleMute called, current muted state:', isMuted);
    
    if (!currentVideo) return;
    
    try {
      await currentVideo.setIsMutedAsync(!isMuted);
      setIsMuted(!isMuted);
      console.log('   ✅ Mute toggled to:', !isMuted);
    } catch (e) {
      console.error('   ❌ Error toggling mute:', e);
    }
  };

  const handleVideoPlaybackStatusUpdate = (index: number) => (status: AVPlaybackStatus) => {
    // CRITICAL: Always update state for current video, regardless of index
    if (status.isLoaded) {
      // Only log significant changes
      const wasPlaying = isPlaying;
      const nowPlaying = status.isPlaying;
      
      if (wasPlaying !== nowPlaying && index === currentIndex) {
        console.log(`📹 Video ${index + 1} state changed:`, {
          wasPlaying,
          nowPlaying,
          position: Math.round(status.positionMillis / 1000) + 's',
          duration: Math.round(status.durationMillis / 1000) + 's',
        });
      }
      
      // CRITICAL FIX: Always update playing state for current video
      if (index === currentIndex) {
        setIsPlaying(status.isPlaying);
      }
      
      // Auto-loop video
      if (status.didJustFinish && index === currentIndex) {
        console.log('   🔄 Video finished, restarting...');
        videoRefs.current[index]?.replayAsync();
      }
    } else if (status.error) {
      console.error(`   ❌ Video ${index + 1} error:`, status.error);
    }
  };

  // NEW: Generate HTML for 3D model viewer with TRUE photorealistic Dubai HDRI background
  const generate3DModelHTML = (modelUrl: string) => {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
          <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/3.3.0/model-viewer.min.js"></script>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              margin: 0;
              padding: 0;
              overflow: hidden;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            }
            
            /* Photorealistic background using actual image */
            #photo-background {
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background-image: url('https://images.unsplash.com/photo-1512453979798-5ea266f8880c?q=80&w=2070&auto=format&fit=crop');
              background-size: cover;
              background-position: center;
              z-index: 1;
              filter: brightness(1.1) contrast(1.05);
            }
            
            /* Overlay for better model visibility */
            #photo-background::after {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: linear-gradient(
                180deg,
                rgba(255, 248, 230, 0.1) 0%,
                rgba(255, 255, 255, 0.3) 100%
              );
            }
            
            /* Ground platform for the model */
            #platform {
              position: absolute;
              bottom: 0;
              left: 0;
              width: 100%;
              height: 35%;
              background: linear-gradient(
                180deg,
                rgba(255, 255, 255, 0) 0%,
                rgba(245, 245, 245, 0.95) 20%,
                rgba(240, 240, 240, 1) 100%
              );
              z-index: 2;
              box-shadow: 0 -20px 40px rgba(0, 0, 0, 0.1);
            }
            
            /* Realistic shadow on platform */
            #platform::before {
              content: '';
              position: absolute;
              top: 10%;
              left: 50%;
              transform: translateX(-50%);
              width: 60%;
              height: 50px;
              background: radial-gradient(
                ellipse,
                rgba(0, 0, 0, 0.2) 0%,
                transparent 70%
              );
              filter: blur(20px);
            }
            
            /* Model viewer with photorealistic lighting */
            model-viewer {
              width: 100%;
              height: 100vh;
              position: relative;
              z-index: 5;
              background: transparent;
              --poster-color: transparent;
              --progress-bar-color: #D4AF37;
            }
            
            /* Luxury Dubai badge */
            .location-badge {
              position: absolute;
              top: 20px;
              left: 20px;
              background: linear-gradient(135deg, #D4AF37 0%, #F4D03F 100%);
              padding: 10px 20px;
              border-radius: 25px;
              color: white;
              font-size: 12px;
              z-index: 10;
              font-weight: 700;
              letter-spacing: 1.5px;
              box-shadow: 0 4px 15px rgba(212, 175, 55, 0.4);
              text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            }
            
            /* Premium controls */
            .controls {
              position: absolute;
              bottom: 20px;
              left: 50%;
              transform: translateX(-50%);
              background: rgba(0, 0, 0, 0.8);
              padding: 12px 28px;
              border-radius: 30px;
              color: white;
              font-size: 11px;
              z-index: 10;
              backdrop-filter: blur(20px);
              border: 1px solid rgba(255, 255, 255, 0.15);
              letter-spacing: 0.5px;
              font-weight: 500;
              box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
            }
            
            /* Loading indicator */
            .loading {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              color: white;
              font-size: 14px;
              z-index: 4;
              text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
            }
          </style>
        </head>
        <body>
          <!-- Photorealistic Dubai background (actual photo) -->
          <div id="photo-background"></div>
          
          <!-- Platform/ground -->
          <div id="platform"></div>
          
          <!-- 3D Model with photorealistic HDRI lighting -->
          <model-viewer
            src="${modelUrl}"
            alt="3D Property Model"
            auto-rotate
            auto-rotate-delay="0"
            rotation-per-second="15deg"
            camera-controls
            shadow-intensity="2"
            shadow-softness="0.9"
            exposure="1.4"
            environment-image="https://modelviewer.dev/shared-assets/environments/spruit_sunrise_1k_HDR.hdr"
            skybox-image="https://modelviewer.dev/shared-assets/environments/spruit_sunrise_1k_HDR.hdr"
            tone-mapping="commerce"
            camera-orbit="0deg 80deg 110%"
            min-camera-orbit="auto auto 5%"
            max-camera-orbit="auto auto 200%"
            interpolation-decay="200"
          >
            <div class="loading" slot="poster">Loading 3D Model...</div>
          </model-viewer>
          
          <!-- Dubai location badge -->
          <div class="location-badge">
            📍 DUBAI, UAE
          </div>
          
          <!-- Luxury controls -->
          <div class="controls">
            ✨ Premium 3D Experience • Rotate • Zoom • Explore
          </div>
        </body>
      </html>
    `;
  };

  // NEW: Web-compatible 3D Model Viewer Component
  const Model3DViewer = ({ url, borderRadius }: { url: string; borderRadius: number }) => {
    if (Platform.OS === 'web') {
      // Use iframe for web with plain CSS styles
      return (
        <iframe
          src={`data:text/html;charset=utf-8,${encodeURIComponent(generate3DModelHTML(url))}`}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: borderRadius ? `${borderRadius}px` : '0px',
            backgroundColor: '#1a1a1a',
          }}
          sandbox="allow-scripts allow-same-origin"
          title="3D Model Viewer"
        />
      );
    } else if (WebView) {
      // Use WebView for native platforms
      return (
        <WebView
          source={{ html: generate3DModelHTML(url) }}
          style={[styles.image, { borderRadius }]}
          scrollEnabled={false}
          bounces={false}
        />
      );
    } else {
      // Fallback for unsupported platforms
      return (
        <View style={[styles.image, { borderRadius }, styles.placeholderContainer]}>
          <Box size={48} color="#999" />
          <Text style={styles.placeholderText}>
            3D Model viewer not supported on this platform
          </Text>
        </View>
      );
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { height, borderRadius }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme?.primary || '#007AFF'} />
          <Text style={[styles.loadingText, { color: theme?.text || '#000' }]}>
            Loading media...
          </Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.placeholderContainer, { height, borderRadius }]}>
        <ImageIcon size={40} color={theme?.tabIconDefault || '#999'} />
        <Text style={[styles.placeholderText, { color: theme?.tabIconDefault || '#999' }]}>
          Failed to load media
        </Text>
        <Text style={[styles.errorText, { color: '#FF3B30' }]}>
          {error}
        </Text>
        <TouchableOpacity onPress={fetchPropertyImages} style={styles.retryButton}>
          <Text style={[styles.retryText, { color: theme?.primary || '#007AFF' }]}>
            Retry
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (images.length === 0) {
    return (
      <View style={[styles.container, styles.placeholderContainer, { height, borderRadius, backgroundColor: theme?.cardBackground || '#F5F5F5' }]}>
        <ImageIcon size={48} color={theme?.tabIconDefault || '#999'} />
        <Text style={[styles.placeholderText, { color: theme?.tabIconDefault || '#999' }]}>
          No media available
        </Text>
      </View>
    );
  }

  const currentMedia = images[currentIndex];

  return (
    <View style={[styles.container, { height }]}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        decelerationRate="fast"
        snapToInterval={imageWidth}
        snapToAlignment="center"
        style={styles.scrollView}
      >
        {images.map((media, index) => (
          <View key={media.id} style={[styles.imageContainer, { width: imageWidth }]}>
            {media.type === 'video' ? (
              // NEW: Video rendering with indexed refs and better debugging
              <View style={styles.videoWrapper}>
                <Video
                  ref={(ref) => {
                    if (ref) {
                      videoRefs.current[index] = ref;
                      console.log(`📹 Video ref ASSIGNED for index ${index}`);
                      console.log(`   Type: ${media.type}`);
                      console.log(`   URL: ${media.url.substring(0, 60)}...`);
                    } else {
                      console.log(`📹 Video ref CLEARED for index ${index}`);
                    }
                  }}
                  source={{ uri: media.url }}
                  style={[styles.image, { borderRadius }]}
                  resizeMode={ResizeMode.COVER}
                  isLooping
                  isMuted={isMuted}
                  shouldPlay={false}
                  progressUpdateIntervalMillis={250}
                  onPlaybackStatusUpdate={handleVideoPlaybackStatusUpdate(index)}
                  useNativeControls={false}
                  onLoadStart={() => {
                    console.log(`📥 LOAD START - Video ${index + 1}/${images.length}`);
                    console.log(`   URL: ${media.url}`);
                    console.log(`   Is current: ${index === currentIndex}`);
                  }}
                  onLoad={(status) => {
                    console.log(`✅ LOAD SUCCESS - Video ${index + 1}`);
                    console.log(`   Duration: ${Math.round(status.durationMillis / 1000)}s`);
                    console.log(`   Is current slide: ${index === currentIndex}`);
                    console.log(`   URI: ${status.uri}`);
                  }}
                  onError={(error) => {
                    console.error(`❌ LOAD ERROR - Video ${index + 1}`);
                    console.error(`   URL: ${media.url}`);
                    console.error(`   Error:`, error);
                  }}
                  onReadyForDisplay={() => {
                    console.log(`🎬 READY FOR DISPLAY - Video ${index + 1}`);
                  }}
                />
                
                {/* Video Controls Overlay - Only show on current slide */}
                {index === currentIndex && (
                  <View style={styles.videoControlsOverlay}>
                    {/* Play/Pause Button */}
                    <TouchableOpacity
                      style={styles.playPauseButton}
                      onPress={() => {
                        console.log(`👆 PLAY BUTTON PRESSED on slide ${index}`);
                        togglePlayPause();
                      }}
                      activeOpacity={0.8}
                    >
                      {isPlaying ? (
                        <Pause size={32} color="white" fill="white" />
                      ) : (
                        <Play size={32} color="white" fill="white" />
                      )}
                    </TouchableOpacity>

                    {/* Mute/Unmute Button */}
                    <TouchableOpacity
                      style={styles.muteButton}
                      onPress={toggleMute}
                      activeOpacity={0.8}
                    >
                      {isMuted ? (
                        <VolumeX size={20} color="white" />
                      ) : (
                        <Volume2 size={20} color="white" />
                      )}
                    </TouchableOpacity>

                    {/* Video Badge */}
                    <View style={styles.videoBadge}>
                      <Text style={styles.videoBadgeText}>VIDEO</Text>
                    </View>

                    {/* Debug Info (only in development) */}
                    {__DEV__ && (
                      <View style={styles.debugBadge}>
                        <Text style={styles.debugText}>
                          {isPlaying ? '▶️ PLAYING' : '⏸️ PAUSED'} | Slide {currentIndex + 1}/{images.length} | Idx: {index}
                        </Text>
                      </View>
                    )}

                    {/* Playing Indicator - Visual feedback */}
                    {isPlaying && (
                      <View style={styles.playingIndicator}>
                        <View style={styles.playingDot} />
                        <Text style={styles.playingText}>PLAYING</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            ) : media.type === 'model' ? (
              // NEW: 3D Model rendering with web support
              <View style={styles.modelWrapper}>
                <Model3DViewer 
                  url={media.url} 
                  borderRadius={borderRadius}
                />
                {/* 3D Model Badge */}
                <View style={styles.modelBadge}>
                  <Box size={12} color="white" />
                  <Text style={styles.modelBadgeText}>3D MODEL</Text>
                </View>
              </View>
            ) : (
              // Existing: Image rendering
              <Image
                source={{ uri: media.url }}
                style={[styles.image, { borderRadius }]}
                resizeMode="cover"
                onLoadStart={() => console.log(`📥 Loading image ${index + 1}/${images.length}`)}
                onLoad={() => console.log(`✅ Image ${index + 1} loaded successfully`)}
                onError={(e) => {
                  console.error(`❌ Image ${index + 1} failed to load`);
                  console.error(`   URL: ${media.url.substring(0, 60)}...`);
                  console.error('   Error:', e.nativeEvent.error);
                }}
              />
            )}
          </View>
        ))}
      </ScrollView>

      {showControls && images.length > 1 && !compact && (
        <>
          <TouchableOpacity
            style={[styles.navButton, styles.navButtonLeft, { backgroundColor: theme?.card || '#FFF' }]}
            onPress={goToPrevious}
          >
            <ChevronLeft size={24} color={theme?.text || '#000'} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.navButton, styles.navButtonRight, { backgroundColor: theme?.card || '#FFF' }]}
            onPress={goToNext}
          >
            <ChevronRight size={24} color={theme?.text || '#000'} />
          </TouchableOpacity>
        </>
      )}

      {showIndicators && images.length > 1 && (
        <View style={styles.indicatorContainer}>
          {images.map((media, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => goToIndex(index)}
              style={[
                styles.indicator,
                currentIndex === index && styles.indicatorActive,
                { 
                  backgroundColor: currentIndex === index 
                    ? (theme?.primary || '#007AFF') 
                    : 'rgba(255, 255, 255, 0.5)' 
                }
              ]}
            />
          ))}
        </View>
      )}

      {images.length > 1 && (
        <View style={[styles.counterBadge, { backgroundColor: theme?.card || '#FFF' }]}>
          <Text style={[styles.counterText, { color: theme?.text || '#000' }]}>
            {currentIndex + 1} / {images.length}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  placeholderContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  placeholderText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -20,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  navButtonLeft: {
    left: 12,
  },
  navButtonRight: {
    right: 12,
  },
  indicatorContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  indicatorActive: {
    width: 24,
  },
  counterBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '600',
  },
  // NEW: Video-specific styles
  videoWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  videoControlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playPauseButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
  },
  muteButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255, 0, 0, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  videoBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  debugBadge: {
    position: 'absolute',
    bottom: 60,
    left: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  debugText: {
    color: '#00ff00',
    fontSize: 9,
    fontFamily: 'monospace',
  },
  playingIndicator: {
    position: 'absolute',
    top: 60,
    left: 16,
    backgroundColor: 'rgba(0, 200, 0, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  playingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
  playingText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  // NEW: 3D Model-specific styles
  modelWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
    backgroundColor: '#1a1a1a',
  },
  modelBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(0, 150, 255, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  modelBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});