import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { Colors } from '@/constants/Colors';
import { 
  X, 
  Download, 
  Share2, 
  FileText, 
  Calendar,
  MessageSquare,
  Building,
  Check
} from 'lucide-react-native';
import { pdfService } from '@/services/PDFService';

interface Message {
  id: string;
  text: string;
  timestamp: Date;
  isUser: boolean;
  properties?: any[];
}

interface ChatExportModalProps {
  visible: boolean;
  onClose: () => void;
  messages: Message[];
}

export function ChatExportModal({ visible, onClose, messages }: ChatExportModalProps) {
  const { isDarkMode } = useTheme();
  const theme = isDarkMode ? Colors.dark : Colors.light;
  const [isExporting, setIsExporting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [exportSuccess, setExportSuccess] = useState(false);

  const generateDefaultFileName = () => {
    const date = new Date().toISOString().split('T')[0];
    return `baitak-chat-${date}`;
  };

  const getConversationStats = () => {
    const totalMessages = messages.length;
    const userMessages = messages.filter(m => m.isUser).length;
    const aiMessages = messages.filter(m => !m.isUser).length;
    const propertiesShown = messages.reduce((total, m) => total + (m.properties?.length || 0), 0);
    
    const firstMessage = messages[0];
    const lastMessage = messages[messages.length - 1];
    
    return {
      totalMessages,
      userMessages,
      aiMessages,
      propertiesShown,
      startDate: firstMessage?.timestamp,
      endDate: lastMessage?.timestamp
    };
  };

  const handleSavePDF = async () => {
    if (messages.length === 0) {
      Alert.alert('No Messages', 'There are no messages to export.');
      return;
    }

    setIsExporting(true);
    try {
      const finalFileName = fileName.trim() || generateDefaultFileName();
      await pdfService.savePDF(messages, `${finalFileName}.html`);
      
      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error saving document:', error);
      Alert.alert('Export Error', 'Failed to save document. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSharePDF = async () => {
    if (messages.length === 0) {
      Alert.alert('No Messages', 'There are no messages to share.');
      return;
    }

    setIsExporting(true);
    try {
      await pdfService.sharePDF(messages);
      
      setExportSuccess(true);
      setTimeout(() => {
        setExportSuccess(false);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error sharing document:', error);
      Alert.alert('Share Error', 'Failed to share document. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const stats = getConversationStats();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: theme.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
                <FileText size={24} color={theme.primary} />
              </View>
              <View>
                <Text style={[styles.title, { color: theme.text }]}>Export Chat</Text>
                <Text style={[styles.subtitle, { color: theme.tabIconDefault }]}>
                  Save your conversation as HTML document
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Stats */}
          <View style={[styles.statsContainer, { backgroundColor: theme.background }]}>
            <Text style={[styles.statsTitle, { color: theme.text }]}>Conversation Summary</Text>
            
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <MessageSquare size={20} color={theme.primary} />
                <Text style={[styles.statNumber, { color: theme.text }]}>{stats.totalMessages}</Text>
                <Text style={[styles.statLabel, { color: theme.tabIconDefault }]}>Messages</Text>
              </View>
              
              <View style={styles.statItem}>
                <Building size={20} color={theme.primary} />
                <Text style={[styles.statNumber, { color: theme.text }]}>{stats.propertiesShown}</Text>
                <Text style={[styles.statLabel, { color: theme.tabIconDefault }]}>Properties</Text>
              </View>
              
              <View style={styles.statItem}>
                <Calendar size={20} color={theme.primary} />
                <Text style={[styles.statNumber, { color: theme.text }]}>
                  {stats.startDate ? stats.startDate.toLocaleDateString() : 'N/A'}
                </Text>
                <Text style={[styles.statLabel, { color: theme.tabIconDefault }]}>Started</Text>
              </View>
            </View>
          </View>

          {/* File Name Input */}
          <View style={styles.inputSection}>
            <Text style={[styles.inputLabel, { color: theme.text }]}>File Name (optional)</Text>
            <TextInput
              style={[styles.input, { 
                backgroundColor: theme.background,
                color: theme.text,
                borderColor: theme.border
              }]}
              value={fileName}
              onChangeText={setFileName}
              placeholder={generateDefaultFileName()}
              placeholderTextColor={theme.tabIconDefault}
            />
            <Text style={[styles.inputHint, { color: theme.tabIconDefault }]}>
              Leave empty to use default name with today's date
            </Text>
          </View>

          {/* Export Options */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton, { backgroundColor: theme.primary }]}
              onPress={handleSavePDF}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="white" />
              ) : exportSuccess ? (
                <Check size={20} color="white" />
              ) : (
                <Download size={20} color="white" />
              )}
              <Text style={styles.actionButtonText}>
                {isExporting ? 'Exporting...' : exportSuccess ? 'Saved!' : 'Save Document'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.shareButton, { 
                backgroundColor: theme.background,
                borderColor: theme.border
              }]}
              onPress={handleSharePDF}
              disabled={isExporting}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : exportSuccess ? (
                <Check size={20} color={theme.primary} />
              ) : (
                <Share2 size={20} color={theme.primary} />
              )}
              <Text style={[styles.shareButtonText, { color: theme.primary }]}>
                {isExporting ? 'Sharing...' : exportSuccess ? 'Shared!' : 'Share Document'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View style={[styles.infoContainer, { backgroundColor: theme.background }]}>
            <Text style={[styles.infoText, { color: theme.tabIconDefault }]}>
              The document will include all messages, property details, and agent information from this conversation in a beautifully formatted HTML file.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
    fontFamily: 'PorscheDesign-SemiBold',
  },
  subtitle: {
    fontSize: 14,
    fontFamily: 'PorscheDesign-Regular',
  },
  closeButton: {
    padding: 4,
  },
  statsContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    fontFamily: 'PorscheDesign-SemiBold',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
    fontFamily: 'PorscheDesign-Bold',
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
    fontFamily: 'PorscheDesign-Regular',
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    fontFamily: 'PorscheDesign-SemiBold',
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: 'PorscheDesign-Regular',
  },
  inputHint: {
    fontSize: 12,
    marginTop: 6,
    fontFamily: 'PorscheDesign-Regular',
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 12,
    gap: 8,
  },
  saveButton: {
    // backgroundColor set dynamically
  },
  shareButton: {
    borderWidth: 1,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'PorscheDesign-SemiBold',
  },
  infoContainer: {
    borderRadius: 8,
    padding: 12,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
    fontFamily: 'PorscheDesign-Regular',
  },
});