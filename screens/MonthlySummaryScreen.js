import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, StatusBar } from 'react-native';
import { ArrowLeft, Calendar, Mail, Sparkles, TrendingUp } from 'lucide-react-native';
import { useState } from 'react';
import { generateMonthlySummary } from '../utils/aiSummary';
import { sendMonthlyEmail } from '../utils/emailService';
import { generateMonthlyEmailHTML } from '../utils/emailTemplates';
import { getMemoriesForChild } from '../utils/storage';
import { auth } from '../utils/firebase';
import ChildAvatar from '../components/ChildAvatar';
import { parseLocalDate } from '../utils/dateHelper';

export default function MonthlySummaryScreen({ navigation, route }) {
  const { child } = route.params;
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState(null);
  const [memoryStats, setMemoryStats] = useState(null);

  const handleGenerateSummary = async () => {
    try {
      setGenerating(true);
      
      // Get current month/year
      const now = new Date();
      const month = now.toLocaleString('default', { month: 'long' });
      const year = now.getFullYear();
      
      // Get memories for this child from current month
      const allMemories = await getMemoriesForChild(child.id);
      const currentMonthMemories = allMemories.filter(memory => {
        // Parse date as local date to avoid timezone issues
        const memoryDate = parseLocalDate(memory.date);
        return memoryDate.getMonth() === now.getMonth() && 
               memoryDate.getFullYear() === now.getFullYear();
      });

      if (currentMonthMemories.length === 0) {
        Alert.alert(
          'No Memories This Month',
          `There are no memories for ${child.name} in ${month} ${year} yet. Add some memories first!`
        );
        setGenerating(false);
        return;
      }

      // Calculate stats
      const stats = {
        totalMemories: currentMonthMemories.length,
        milestones: currentMonthMemories.filter(m => m.milestone).length,
        photos: currentMonthMemories.filter(m => m.type === 'photo').length,
        voiceNotes: currentMonthMemories.filter(m => m.type === 'audio').length,
        textNotes: currentMonthMemories.filter(m => m.type === 'text').length,
      };
      setMemoryStats(stats);

      // Generate AI summary
      const aiSummary = await generateMonthlySummary(
        currentMonthMemories,
        child.name,
        month,
        year
      );

      setSummary({
        text: aiSummary,
        month,
        year,
        memories: currentMonthMemories,
      });

    } catch (error) {
      console.error('Error generating summary:', error);
      Alert.alert('Error', 'Failed to generate summary. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleEmailSummary = async () => {
    if (!summary) {
      Alert.alert('No Summary', 'Please generate a summary first');
      return;
    }

    const user = auth.currentUser;
    if (!user || !user.email) {
      Alert.alert('Error', 'No user email found');
      return;
    }

    try {
      setSending(true);

      // Generate HTML email
      const htmlContent = generateMonthlyEmailHTML(
        child.name,
        summary.month,
        summary.year,
        summary.text,
        {
          milestones: memoryStats?.milestones || 0,
          memories: summary.memories.slice(0, 5) // Top 5 memories
        },
        memoryStats?.totalMemories || 0
      );

      // Send email
      await sendMonthlyEmail(
        user.email,
        `${child.name}'s ${summary.month} ${summary.year} Memory Summary`,
        htmlContent
      );

      Alert.alert(
        'Email Sent! 📧',
        `Your monthly summary has been sent to ${user.email}`,
        [{ text: 'OK' }]
      );

    } catch (error) {
      console.error('Error sending email:', error);
      Alert.alert(
        'Email Failed',
        error.message || 'Failed to send email. Please try again.'
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="light-content" translucent={true} backgroundColor="transparent" />
      {/* Header */}
      <View className="bg-primary p-4 flex-row items-center" style={{ paddingTop: 70 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3">
          <ArrowLeft size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-white">Monthly Summary</Text>
      </View>

      <ScrollView className="flex-1 p-6">
        {/* Child Info Card */}
        <View className="bg-white rounded-2xl p-6 shadow-lg mb-5" style={{ paddingTop: 10 }}>
          <View className="items-center">
            <View style={{ paddingTop: 4, marginBottom: 8 }}>
              <ChildAvatar
                avatar={child.avatar}
                avatarPhotoUrl={child.avatarPhotoUrl}
                size={96}
              />
            </View>
            <Text className="text-2xl font-bold text-text-dark mb-1">
              {child.name}
            </Text>
            <Text className="text-text-light">AI-Generated Monthly Summary</Text>
          </View>
        </View>

        {/* Automatic Summary Note */}
        <View className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-5">
          <View className="flex-row items-start">
            <Calendar size={20} color="#87C38F" style={{ marginTop: 2, marginRight: 8 }} />
            <View className="flex-1">
              <Text className="text-text-dark text-sm font-semibold mb-1">
                Automatic Monthly Summaries
              </Text>
              <Text className="text-text-light text-xs leading-relaxed">
                Monthly summaries are automatically sent via email on the first business day of each month for the previous month's memories.
              </Text>
            </View>
          </View>
        </View>

        {/* Generate Section */}
        {!summary && (
          <View className="bg-white rounded-2xl p-8 shadow-lg mb-6">
            <View className="items-center">
              <View className="bg-secondary/10 w-24 h-24 rounded-full items-center justify-center mb-4">
                <Sparkles size={48} color="#E07A5F" />
              </View>
              <Text className="text-text-dark text-center text-base leading-relaxed mb-6">
                Generate a beautiful AI summary of this month's memories
              </Text>
              
              <TouchableOpacity
                className={`py-4 px-8 rounded-xl shadow-lg w-full ${
                  generating ? 'bg-gray-400' : 'bg-primary'
                }`}
                onPress={handleGenerateSummary}
                disabled={generating}
              >
                {generating ? (
                  <View className="flex-row items-center justify-center">
                    <ActivityIndicator color="white" size="small" />
                    <Text className="text-white font-bold text-lg ml-2">Generating...</Text>
                  </View>
                ) : (
                  <View className="flex-row items-center justify-center">
                    <Calendar size={20} color="white" />
                    <Text className="text-white font-bold text-lg ml-2">Generate Summary</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Summary Results */}
        {summary && (
          <>
            {/* Stats Cards */}
            <View className="bg-white rounded-2xl p-6 shadow-lg mb-6">
              <View className="flex-row items-center mb-4">
                <TrendingUp size={24} color="#87C38F" />
                <Text className="text-xl font-bold text-text-dark ml-2">
                  {summary.month} {summary.year} Highlights
                </Text>
              </View>

              <View className="flex-row flex-wrap gap-3">
                <View className="flex-1 min-w-[45%] bg-primary/10 p-4 rounded-xl">
                  <Text className="text-3xl font-bold text-primary mb-1">
                    {memoryStats?.totalMemories || 0}
                  </Text>
                  <Text className="text-sm text-text-light">
                    {memoryStats?.totalMemories === 1 ? 'Memory' : 'Memories'}
                  </Text>
                </View>

                <View className="flex-1 min-w-[45%] bg-accent/20 p-4 rounded-xl">
                  <Text className="text-3xl font-bold text-accent-dark mb-1">
                    {memoryStats?.milestones || 0}
                  </Text>
                  <Text className="text-sm text-text-light">
                    {memoryStats?.milestones === 1 ? 'Milestone' : 'Milestones'}
                  </Text>
                </View>

                {memoryStats?.photos > 0 && (
                  <View className="flex-1 min-w-[45%] bg-secondary/10 p-4 rounded-xl">
                    <Text className="text-3xl font-bold text-secondary mb-1">
                      {memoryStats.photos}
                    </Text>
                    <Text className="text-sm text-text-light">
                      {memoryStats.photos === 1 ? 'Photo' : 'Photos'}
                    </Text>
                  </View>
                )}

                {memoryStats?.voiceNotes > 0 && (
                  <View className="flex-1 min-w-[45%] bg-primary/10 p-4 rounded-xl">
                    <Text className="text-3xl font-bold text-primary mb-1">
                      {memoryStats.voiceNotes}
                    </Text>
                    <Text className="text-sm text-text-light">
                      Voice {memoryStats.voiceNotes === 1 ? 'Note' : 'Notes'}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* AI Summary */}
            <View className="bg-white rounded-2xl p-6 shadow-lg mb-6">
              <View className="flex-row items-center mb-4">
                <View className="bg-secondary/10 w-10 h-10 rounded-full items-center justify-center mr-3">
                  <Sparkles size={20} color="#E07A5F" />
                </View>
                <Text className="text-xl font-bold text-text-dark">AI Summary</Text>
              </View>

              <Text className="text-text-dark text-base leading-relaxed">
                {summary.text}
              </Text>
            </View>

            {/* Email Button */}
            <TouchableOpacity
              className={`py-4 rounded-xl shadow-lg mb-4 ${
                sending ? 'bg-gray-400' : 'bg-primary'
              }`}
              onPress={handleEmailSummary}
              disabled={sending}
            >
              {sending ? (
                <View className="flex-row items-center justify-center">
                  <ActivityIndicator color="white" size="small" />
                  <Text className="text-white font-bold text-lg ml-2">Sending...</Text>
                </View>
              ) : (
                <View className="flex-row items-center justify-center">
                  <Mail size={20} color="white" />
                  <Text className="text-white font-bold text-lg ml-2">
                    Email Me This Summary
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Generate New Button */}
            <TouchableOpacity
              className="py-3 rounded-xl border-2 border-secondary"
              onPress={() => {
                setSummary(null);
                setMemoryStats(null);
              }}
            >
              <Text className="text-secondary font-semibold text-center">
                Generate New Summary
              </Text>
            </TouchableOpacity>

            {/* Email Info */}
            <View className="bg-accent/10 border border-accent/30 rounded-xl p-4 mt-4">
              <Text className="text-text-light text-sm text-center">
                📧 Email will be sent to: {auth.currentUser?.email}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}